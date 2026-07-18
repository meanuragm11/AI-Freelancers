import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { calculateEscrowMilestonePlatformFee } from '@/lib/milestones/platformFees';
import { resolveServiceListingCheckoutAmount } from '@/lib/milestones/syncServiceCheckoutPrice';
import { assertProfileCan, ModerationBlockedError } from '@/lib/moderation/checks';
import { convertUsdToRazorpayCheckoutAmount } from '@/lib/payments/razorpayCurrency';
import { resolveRazorpayCheckoutKeyId } from '@/lib/payments/razorpayCheckoutKey';
import { getRazorpayClient } from '@/lib/payments/razorpayClient';
import { logRazorpayOrderEvent } from '@/lib/payments/razorpayOrderLog';
import {
  fetchRazorpayOrder,
  validateRazorpayOrderForReuse,
} from '@/lib/payments/razorpayOrderValidation';
import { ACTIVE_DISPUTE_STATUSES } from '@/lib/disputes/constants';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type OrderPayload = {
  transactionType?: string;
  itemId?: string;
  buyerId?: string;
  forceRefresh?: boolean;
};

async function expirePendingTransactionsForCheckout(
  buyerId: string,
  itemId: string,
  transactionType: string,
  excludeTransactionId?: string
) {
  let query = supabaseAdmin
    .from('transactions')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('buyer_id', buyerId)
    .eq('item_id', itemId)
    .eq('transaction_type', transactionType)
    .eq('status', 'pending');

  if (excludeTransactionId) {
    query = query.neq('id', excludeTransactionId);
  }

  const { error } = await query;
  if (error) throw error;
}

async function getServerUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function hasActiveDisputeForCollab(collabId: string) {
  const { data: dispute, error: disputeError } = await supabaseAdmin
    .from('disputes')
    .select('id')
    .eq('collab_id', collabId)
    .in('status', ACTIVE_DISPUTE_STATUSES)
    .maybeSingle();

  if (disputeError) throw disputeError;
  return Boolean(dispute);
}

function mapTransactionType(transactionType: string) {
  if (
    transactionType === 'escrow_funding' ||
    transactionType === 'collab_milestone' ||
    transactionType === 'milestone_funding'
  ) {
    return { internal: 'collab_milestone', checkoutType: 'escrow' };
  }
  if (transactionType === 'component_purchase' || transactionType === 'service_purchase') {
    return { internal: transactionType, checkoutType: 'solution' };
  }
  if (transactionType === 'revision_purchase') {
    return { internal: 'revision_purchase', checkoutType: 'revision' };
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionType, itemId, buyerId, forceRefresh } = (await req.json()) as OrderPayload;

    if (!transactionType || !itemId) {
      return NextResponse.json({ error: 'Missing required payment data' }, { status: 400 });
    }

    if (buyerId && buyerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await assertProfileCan(supabaseAdmin, user.id, 'engage', 'Your account cannot make purchases at this time.');

    const mappedType = mapTransactionType(transactionType);
    if (!mappedType) {
      return NextResponse.json({ error: 'Unsupported transaction type' }, { status: 400 });
    }

    const { internal, checkoutType } = mappedType;

    let platformFee = 0;
    let finalCharge = 0;

    if (internal === 'collab_milestone') {
      const { data: milestone, error: milestoneError } = await supabaseAdmin
        .from('milestones')
        .select(
          'id, collab_id, amount_usd, status, is_new_milestone, collabs(buyer_id, status, service_id, payment_type, fixed_price_usd, escrow_amount_usd, proposal_platform_fee_charged, cumulative_new_milestones_fee_charged)'
        )
        .eq('id', itemId)
        .maybeSingle();

      if (milestoneError) throw milestoneError;
      const collab = milestone?.collabs as {
        buyer_id?: string;
        status?: string | null;
        service_id?: string | null;
        payment_type?: string | null;
        fixed_price_usd?: number | null;
        escrow_amount_usd?: number | null;
        proposal_platform_fee_charged?: boolean | null;
        cumulative_new_milestones_fee_charged?: boolean | null;
      } | null | undefined;
      if (!milestone || collab?.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (['funded', 'in_progress', 'submitted', 'released'].includes(milestone.status)) {
        return NextResponse.json({ error: 'This milestone is already funded.' }, { status: 409 });
      }

      // Only block on an archived/unavailable service when this is the buyer's *first* payment
      // for the collab (status still pending_funding). Once a collab is active, the builder may
      // have archived the listing afterwards — the buyer must still be able to fund later
      // milestones / revisions for the order they already placed.
      if (collab?.status === 'pending_funding' && collab.service_id) {
        const { data: service, error: serviceError } = await supabaseAdmin
          .from('services')
          .select('status')
          .eq('id', collab.service_id)
          .maybeSingle();

        if (serviceError) throw serviceError;
        if (!service || service.status === 'archived') {
          return NextResponse.json(
            { error: 'This service is no longer available for purchase.' },
            { status: 409 }
          );
        }
      }

      if (await hasActiveDisputeForCollab(milestone.collab_id)) {
        return NextResponse.json(
          { error: 'Escrow funding is paused while a dispute is active.' },
          { status: 409 }
        );
      }

      const resolvedAmount = await resolveServiceListingCheckoutAmount(
        supabaseAdmin,
        milestone,
        collab ?? {}
      );
      milestone.amount_usd = resolvedAmount;

      platformFee = await calculateEscrowMilestonePlatformFee(supabaseAdmin, milestone, collab ?? {});
      finalCharge = resolvedAmount + platformFee;
    } else if (internal === 'component_purchase') {
      const [{ data: component, error: componentError }, { data: existingLibrary, error: libraryError }] = await Promise.all([
        supabaseAdmin
          .from('components')
          .select('id, price_usd, status, delivery_method, secure_payload_text, asset_file_path, file_url')
          .eq('id', itemId)
          .maybeSingle(),
        supabaseAdmin
          .from('library')
          .select('id')
          .eq('user_id', user.id)
          .eq('component_id', itemId)
          .maybeSingle(),
      ]);

      if (componentError) throw componentError;
      if (libraryError) throw libraryError;
      if (!component) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      if (component.status !== 'published') {
        return NextResponse.json({ error: 'This AI Solution is not currently available.' }, { status: 409 });
      }
      if (existingLibrary) {
        return NextResponse.json({ error: 'AI Solution is already in your library.' }, { status: 409 });
      }

      const hasFulfillment =
        component.delivery_method === 'secure_text'
          ? Boolean(component.secure_payload_text)
          : Boolean(component.asset_file_path || component.file_url);

      if (!hasFulfillment) {
        return NextResponse.json({ error: 'This AI Solution is missing fulfillment content.' }, { status: 409 });
      }

      const amountUsd = Number(component.price_usd);
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        return NextResponse.json({ error: 'Invalid item price' }, { status: 400 });
      }

      platformFee = amountUsd < 20 ? 1 : 5;
      finalCharge = amountUsd;
    } else if (internal === 'service_purchase') {
      const [{ data: service, error: serviceError }, { data: existingLibrary, error: libraryError }] =
        await Promise.all([
          supabaseAdmin
            .from('services')
            .select(
              'id, starting_price_usd, pricing_mode, delivery_model, status, fulfillment_payload_text, fulfillment_payload_url, download_file_path'
            )
            .eq('id', itemId)
            .maybeSingle(),
          supabaseAdmin
            .from('library')
            .select('id')
            .eq('user_id', user.id)
            .eq('service_id', itemId)
            .maybeSingle(),
        ]);

      if (serviceError) throw serviceError;
      if (libraryError) throw libraryError;
      if (!service) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      if (service.status !== 'published') {
        return NextResponse.json({ error: 'This AI Solution is not currently available.' }, { status: 409 });
      }
      if (service.delivery_model !== 'instant') {
        return NextResponse.json(
          { error: 'Collaborative solutions use escrow checkout.' },
          { status: 409 }
        );
      }
      if (existingLibrary) {
        return NextResponse.json({ error: 'AI Solution is already in your library.' }, { status: 409 });
      }

      const hasFulfillment = Boolean(
        service.fulfillment_payload_text?.trim() ||
          service.fulfillment_payload_url?.trim() ||
          service.download_file_path
      );

      if (!hasFulfillment) {
        return NextResponse.json({ error: 'This AI Solution is missing fulfillment content.' }, { status: 409 });
      }

      const amountUsd = Number(service.starting_price_usd);
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        return NextResponse.json({ error: 'Invalid item price' }, { status: 400 });
      }

      platformFee = amountUsd < 20 ? 1 : 5;
      finalCharge = amountUsd;
    } else if (internal === 'revision_purchase') {
      const { data: collab, error: collabError } = await supabaseAdmin
        .from('collabs')
        .select('id, buyer_id, extra_revision_price_usd, service_id, services(extra_revision_price_usd)')
        .eq('id', itemId)
        .maybeSingle();

      if (collabError) throw collabError;
      if (!collab || collab.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (await hasActiveDisputeForCollab(itemId)) {
        return NextResponse.json(
          { error: 'Revision purchases are paused while a dispute is active.' },
          { status: 409 }
        );
      }

      const serviceExtra = (collab.services as { extra_revision_price_usd?: number } | null)?.extra_revision_price_usd;
      const amountUsd = Number(collab.extra_revision_price_usd ?? serviceExtra ?? 0);
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        return NextResponse.json({ error: 'Paid revisions are not available for this project.' }, { status: 400 });
      }

      platformFee = 0;
      finalCharge = amountUsd;
    }

    if (!Number.isFinite(finalCharge) || finalCharge <= 0) {
      return NextResponse.json({ error: 'Invalid payable amount' }, { status: 400 });
    }

    let keyId: string;
    try {
      keyId = resolveRazorpayCheckoutKeyId();
    } catch {
      return NextResponse.json(
        { error: 'Payment gateway is not configured. Missing Razorpay key.' },
        { status: 503 }
      );
    }

    const checkoutAmount = convertUsdToRazorpayCheckoutAmount(finalCharge);
    const expectedAmountCents = checkoutAmount.amountSmallestUnit;
    const orderExpectation = {
      amountCents: expectedAmountCents,
      currency: checkoutAmount.currency,
      checkoutType,
      referenceId: itemId,
      userId: user.id,
      transactionType: internal,
      platformFeeUsd: platformFee,
    };

    const { data: reusablePending, error: pendingError } = await supabaseAdmin
      .from('transactions')
      .select('id, order_id, amount_usd, fee_usd, payment_expires_at')
      .eq('buyer_id', user.id)
      .eq('item_id', itemId)
      .eq('transaction_type', internal)
      .eq('status', 'pending')
      .gt('payment_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingError) throw pendingError;

    if (forceRefresh && reusablePending) {
      logRazorpayOrderEvent({
        event: 'order.force_refresh',
        buyerId: user.id,
        orderId: reusablePending.order_id ?? undefined,
        transactionId: reusablePending.id,
        checkoutType,
        referenceId: itemId,
        transactionType: internal,
        forceRefresh: true,
      });
      await expirePendingTransactionsForCheckout(user.id, itemId, internal);
    } else if (reusablePending?.order_id) {
      const pendingAmount = Number(reusablePending.amount_usd);
      const pendingFee = Number(reusablePending.fee_usd ?? 0);

      if (Math.abs(pendingAmount - finalCharge) < 0.01 && pendingFee === platformFee) {
        logRazorpayOrderEvent({
          event: 'order.reuse.attempt',
          buyerId: user.id,
          orderId: reusablePending.order_id,
          transactionId: reusablePending.id,
          checkoutType,
          referenceId: itemId,
          transactionType: internal,
          amountUsd: pendingAmount,
          platformFeeUsd: platformFee,
        });

        const validation = await validateRazorpayOrderForReuse(reusablePending.order_id, {
          ...orderExpectation,
          paymentExpiresAt: reusablePending.payment_expires_at,
        });

        if (validation.valid) {
          logRazorpayOrderEvent({
            event: 'order.reuse.success',
            buyerId: user.id,
            orderId: reusablePending.order_id,
            transactionId: reusablePending.id,
            checkoutType,
            referenceId: itemId,
            transactionType: internal,
            amountUsd: pendingAmount,
            platformFeeUsd: platformFee,
            reused: true,
            razorpayStatus: validation.razorpayStatus,
          });

          const reusedOrder = await fetchRazorpayOrder(reusablePending.order_id);
          const reusedKeyId = resolveRazorpayCheckoutKeyId(reusedOrder);

          return NextResponse.json({
            success: true,
            orderId: reusablePending.order_id,
            amountToPay: pendingAmount,
            amountCents: reusedOrder.amount ?? expectedAmountCents,
            currency: (reusedOrder.currency ?? orderExpectation.currency).toUpperCase(),
            keyId: reusedKeyId,
            platformFee,
            reused: true,
          });
        }

        logRazorpayOrderEvent({
          event: 'order.reuse.rejected',
          buyerId: user.id,
          orderId: reusablePending.order_id,
          transactionId: reusablePending.id,
          checkoutType,
          referenceId: itemId,
          transactionType: internal,
          reason: validation.reason,
          razorpayStatus: validation.razorpayStatus,
          hasCapturedPayment: validation.hasCapturedPayment,
        });

        await supabaseAdmin
          .from('transactions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', reusablePending.id);

        logRazorpayOrderEvent({
          event: 'order.reuse.expired',
          buyerId: user.id,
          orderId: reusablePending.order_id,
          transactionId: reusablePending.id,
          checkoutType,
          referenceId: itemId,
          transactionType: internal,
          reason: validation.reason,
        });
      } else {
        await expirePendingTransactionsForCheckout(user.id, itemId, internal, reusablePending.id);
      }
    }

    await expirePendingTransactionsForCheckout(user.id, itemId, internal);

    const options = {
      amount: checkoutAmount.amountSmallestUnit,
      currency: checkoutAmount.currency,
      receipt: `rcpt_${user.id.substring(0, 8)}_${Date.now()}`,
      notes: {
        checkout_type: checkoutType,
        reference_id: itemId,
        user_id: user.id,
        transaction_type: internal,
        platform_fee_usd: String(platformFee),
      },
    };

    logRazorpayOrderEvent({
      event: 'order.create.start',
      buyerId: user.id,
      checkoutType,
      referenceId: itemId,
      transactionType: internal,
      amountUsd: finalCharge,
      platformFeeUsd: platformFee,
      forceRefresh: Boolean(forceRefresh),
      metadata: {
        createPayload: options,
        keyIdPrefix: keyId.slice(0, 8),
        checkoutCurrency: checkoutAmount.currency,
        expectedAmountCents,
      },
    });

    const order = await getRazorpayClient().orders.create(options);

    logRazorpayOrderEvent({
      event: 'order.create.success',
      buyerId: user.id,
      orderId: order.id,
      checkoutType,
      referenceId: itemId,
      transactionType: internal,
      amountUsd: finalCharge,
      platformFeeUsd: platformFee,
      metadata: {
        razorpayOrder: {
          id: order.id,
          amount: order.amount,
          amount_due: order.amount_due,
          currency: order.currency,
          status: order.status,
          key_id: (order as { key_id?: string | null }).key_id ?? null,
        },
        createPayload: options,
      },
    });

    const { error: insertError } = await supabaseAdmin.from('transactions').insert({
      order_id: order.id,
      buyer_id: user.id,
      item_id: itemId,
      transaction_type: internal,
      amount_usd: finalCharge,
      fee_usd: platformFee,
      status: 'pending',
      payment_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: {
        checkoutType,
      },
    });

    if (insertError) throw insertError;

    const createdKeyId = resolveRazorpayCheckoutKeyId(order);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amountToPay: finalCharge,
      amountCents: order.amount ?? expectedAmountCents,
      currency: (order.currency ?? orderExpectation.currency).toUpperCase(),
      keyId: createdKeyId,
      platformFee,
    });
  } catch (error: unknown) {
    if (error instanceof ModerationBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Payment initialization failed';
    logRazorpayOrderEvent({
      event: 'order.create.failed',
      error: message,
    });
    console.error('Razorpay Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
