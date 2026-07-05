import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import {
  areAllOriginalMilestonesFunded,
  calculateEscrowMilestonePlatformFee,
} from '@/lib/milestones/platformFees';
import { postMilestoneChatMessage } from '@/lib/milestones/chatMessages';
import { logBusinessEvent } from '@/lib/events/businessEvents';

type FulfillParams = {
  checkoutType: 'escrow' | 'asset' | 'revision';
  referenceId: string;
  userId: string;
  orderId: string;
  paymentId: string;
  transactionId?: string | null;
  idempotencyBase?: string;
};

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fulfillRazorpayPayment(
  params: FulfillParams,
  supabaseAdmin: SupabaseClient = getAdminClient()
) {
  const {
    checkoutType,
    referenceId,
    userId,
    orderId,
    paymentId,
    transactionId: existingTransactionId,
    idempotencyBase,
  } = params;

  const webhookIdempotencyBase = idempotencyBase ?? `razorpay:${paymentId || orderId || referenceId}`;

  let transactionId = existingTransactionId ?? null;
  if (orderId) {
    const { data: transaction, error: transactionUpdateError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'completed',
        razorpay_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .select('id')
      .maybeSingle();

    if (transactionUpdateError) throw transactionUpdateError;
    transactionId = transaction?.id ?? transactionId;
  }

  void logBusinessEvent({
    eventType: 'payment.captured',
    entityType: 'transaction',
    entityId: transactionId,
    actorId: userId,
    summary: `Razorpay payment captured (${checkoutType}) — payment ${paymentId}`,
    metadata: { checkoutType, referenceId, orderId, paymentId },
  });

  if (checkoutType === 'escrow') {
    const { data: milestone, error: milestoneError } = await supabaseAdmin
      .from('milestones')
      .select(
        'id, collab_id, title, amount_usd, is_new_milestone, collabs(buyer_id, builder_id, proposal_platform_fee_charged, cumulative_new_milestones_fee_charged)'
      )
      .eq('id', referenceId)
      .single();

    if (milestoneError || !milestone) {
      throw new Error(`Escrow milestone not found: ${milestoneError?.message}`);
    }

    const { data: activeDispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select('id')
      .eq('collab_id', milestone.collab_id)
      .in('status', ['waiting_for_freelancer', 'waiting_for_buyer', 'negotiation', 'under_review', 'arbitration_requested'])
      .maybeSingle();

    if (disputeError) throw disputeError;
    if (activeDispute) {
      throw new Error('Escrow funding finalization blocked because an active dispute exists.');
    }

    const { error: updateError } = await supabaseAdmin
      .from('milestones')
      .update({ status: 'funded' })
      .eq('id', referenceId)
      .in('status', ['draft', 'pending_funding']);

    if (updateError) throw new Error(`Escrow update failed: ${updateError.message}`);

    if (milestone.collab_id) {
      const collabMeta = milestone.collabs as {
        buyer_id?: string;
        builder_id?: string;
        proposal_platform_fee_charged?: boolean | null;
        cumulative_new_milestones_fee_charged?: boolean | null;
      } | null;

      let platformFeeCharged = 0;
      if (orderId) {
        const { data: transaction } = await supabaseAdmin
          .from('transactions')
          .select('fee_usd')
          .eq('order_id', orderId)
          .maybeSingle();
        platformFeeCharged = Number(transaction?.fee_usd ?? 0);
      } else {
        platformFeeCharged = await calculateEscrowMilestonePlatformFee(
          supabaseAdmin,
          milestone,
          collabMeta ?? {}
        );
      }

      const collabUpdates: Record<string, unknown> = { status: 'funded' };
      if (platformFeeCharged > 0) {
        if (milestone.is_new_milestone) {
          collabUpdates.cumulative_new_milestones_fee_charged = true;
        } else {
          collabUpdates.proposal_platform_fee_charged = true;
        }
      }

      await supabaseAdmin.from('collabs').update(collabUpdates).eq('id', milestone.collab_id);

      const { data: collabRow } = await supabaseAdmin
        .from('collabs')
        .select('title, project_request_id')
        .eq('id', milestone.collab_id)
        .single();

      if (collabRow?.project_request_id && userId && !milestone.is_new_milestone) {
        const { data: projectRequest } = await supabaseAdmin
          .from('project_requests')
          .select('payment_type, status')
          .eq('id', collabRow.project_request_id)
          .maybeSingle();

        const alreadyFunded =
          projectRequest?.status === 'funded' || projectRequest?.status === 'completed';
        let shouldMarkFunded = false;

        if (!alreadyFunded && projectRequest) {
          if (projectRequest.payment_type === 'single_payment') {
            shouldMarkFunded = true;
          } else {
            shouldMarkFunded = await areAllOriginalMilestonesFunded(
              supabaseAdmin,
              milestone.collab_id
            );
          }
        }

        if (shouldMarkFunded) {
          const { markProjectRequestFunded } = await import('@/lib/project-proposals/service');
          await markProjectRequestFunded(supabaseAdmin, collabRow.project_request_id, userId);
        }
      }

      if (userId) {
        await postMilestoneChatMessage(supabaseAdmin, {
          collabId: milestone.collab_id,
          senderId: userId,
          milestoneId: milestone.id,
          event: 'funded',
          title: milestone.title,
          amountUsd: Number(milestone.amount_usd),
          platformFeeUsd: platformFeeCharged,
        });
      }
    }

    const collab = milestone.collabs as { buyer_id?: string; builder_id?: string; title?: string } | null;
    if (collab?.buyer_id && collab?.builder_id) {
      const { data: existingEscrowTransaction, error: existingEscrowError } = await supabaseAdmin
        .from('escrow_transactions')
        .select('id')
        .eq('milestone_id', milestone.id)
        .eq('transaction_type', 'milestone_funding')
        .eq('status', 'funded')
        .maybeSingle();

      if (existingEscrowError) throw existingEscrowError;
      if (!existingEscrowTransaction) {
        await supabaseAdmin.from('escrow_transactions').insert({
          collab_id: milestone.collab_id,
          milestone_id: milestone.id,
          buyer_id: collab.buyer_id,
          builder_id: collab.builder_id,
          amount_usd: milestone.amount_usd,
          transaction_type: 'milestone_funding',
          status: 'funded',
        });
      }

      const { data: collabRowForNotify } = await supabaseAdmin
        .from('collabs')
        .select('title')
        .eq('id', milestone.collab_id)
        .single();

      void logBusinessEvent({
        eventType: 'escrow.funded',
        entityType: 'collab',
        entityId: milestone.collab_id,
        collabId: milestone.collab_id,
        actorId: userId,
        amountUsd: Number(milestone.amount_usd),
        summary: `Escrow funded for "${collabRowForNotify?.title || 'a project'}"`,
        metadata: { milestoneId: milestone.id, transactionId },
      });

      void sendNotification({
        type: NotificationType.ESCROW_FUNDED,
        recipientId: collab.builder_id,
        title: 'Escrow funded',
        message: `Escrow of $${milestone.amount_usd} has been funded. You can begin work on the milestone.`,
        link: `/builder/inbox?conversation=${milestone.collab_id}`,
        metadata: {
          collabId: milestone.collab_id,
          projectName: collabRowForNotify?.title || 'Your project',
          amount: milestone.amount_usd,
          actorId: collab.buyer_id,
          idempotencyKey: `${webhookIdempotencyBase}:escrow:${referenceId}`,
        },
      });
    }

    return { checkoutType, referenceId, collabId: milestone.collab_id };
  }

  if (checkoutType === 'revision') {
    const { data: collab, error: collabError } = await supabaseAdmin
      .from('collabs')
      .select('id, buyer_id, builder_id, title, max_revisions, revisions_used')
      .eq('id', referenceId)
      .maybeSingle();

    if (collabError) throw collabError;
    if (!collab) throw new Error('Collab not found for revision purchase');

    if (orderId) {
      const { data: existingTxn, error: existingTxnError } = await supabaseAdmin
        .from('transactions')
        .select('metadata')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingTxnError) throw existingTxnError;

      const existingMeta = (existingTxn?.metadata as Record<string, unknown> | null) ?? {};
      if (existingMeta.revision_slot_granted) {
        return {
          checkoutType,
          referenceId,
          collabId: referenceId,
          maxRevisions: Number(existingMeta.revision_max_after ?? collab.max_revisions ?? 0),
          alreadyFulfilled: true,
        };
      }
    }

    const currentMax = Number(collab.max_revisions ?? 0);
    const revisionsUsed = Number(collab.revisions_used ?? 0);
    // Grant exactly one usable revision even if revisions_used drifted above max_revisions.
    const nextMaxRevisions = Math.max(currentMax, revisionsUsed) + 1;

    const { error: updateError } = await supabaseAdmin
      .from('collabs')
      .update({ max_revisions: nextMaxRevisions })
      .eq('id', referenceId);

    if (updateError) throw updateError;

    if (orderId) {
      const { data: txnForMeta } = await supabaseAdmin
        .from('transactions')
        .select('metadata')
        .eq('order_id', orderId)
        .maybeSingle();

      const txnMeta = (txnForMeta?.metadata as Record<string, unknown> | null) ?? {};
      await supabaseAdmin
        .from('transactions')
        .update({
          metadata: {
            ...txnMeta,
            revision_slot_granted: true,
            revision_max_after: nextMaxRevisions,
          },
        })
        .eq('order_id', orderId);
    }

    if (collab.builder_id) {
      void sendNotification({
        type: NotificationType.MILESTONE_SUBMITTED,
        recipientId: collab.builder_id,
        title: 'Extra revision purchased',
        message: `The buyer purchased an additional revision for "${collab.title || 'your project'}".`,
        link: `/collab/${referenceId}`,
        metadata: {
          collabId: referenceId,
          projectName: collab.title || 'Your project',
          actorId: userId,
          idempotencyKey: `${webhookIdempotencyBase}:revision:${referenceId}`,
        },
      });
    }

    return { checkoutType, referenceId, collabId: referenceId, maxRevisions: nextMaxRevisions };
  }

  if (!userId) throw new Error('Missing user_id for asset purchase');

  const { error: libError } = await supabaseAdmin
    .from('library')
    .upsert(
      {
        user_id: userId,
        component_id: referenceId,
        transaction_id: transactionId,
        source: 'purchase',
      },
      { onConflict: 'user_id,component_id' }
    );

  if (libError) {
    throw new Error(`Library insert failed: ${libError.message}`);
  }

  const { data: transaction } = transactionId
    ? await supabaseAdmin.from('transactions').select('metadata').eq('id', transactionId).maybeSingle()
    : { data: null };

  const alreadyCounted = Boolean((transaction?.metadata as Record<string, unknown> | null)?.sales_counted);
  if (!alreadyCounted) {
    const { data: componentRow } = await supabaseAdmin
      .from('components')
      .select('sales_count')
      .eq('id', referenceId)
      .maybeSingle();

    const nextSalesCount = Number(componentRow?.sales_count ?? 0) + 1;
    await supabaseAdmin
      .from('components')
      .update({ sales_count: nextSalesCount })
      .eq('id', referenceId);

    if (transactionId) {
      await supabaseAdmin
        .from('transactions')
        .update({
          metadata: {
            ...((transaction?.metadata as Record<string, unknown> | null) ?? {}),
            sales_counted: true,
          },
        })
        .eq('id', transactionId);
    }
  }

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('title, builder_id')
    .eq('id', referenceId)
    .maybeSingle();

  void sendNotification({
    type: NotificationType.AI_ASSET_PURCHASED,
    recipientId: userId,
    title: 'AI asset purchased',
    message: `Your purchase of "${component?.title || 'AI asset'}" is confirmed.`,
    link: '/buyer/library',
    metadata: {
      assetName: component?.title,
      actorId: userId,
      idempotencyKey: `${webhookIdempotencyBase}:asset-buyer:${userId}:${referenceId}`,
    },
  });

  if (component?.builder_id) {
    void sendNotification({
      type: NotificationType.SERVICE_PURCHASED,
      recipientId: component.builder_id,
      title: 'Your AI asset was purchased',
      message: `A buyer purchased "${component.title}".`,
      link: '/builder/dashboard',
      metadata: {
        assetName: component.title,
        actorId: userId,
        idempotencyKey: `${webhookIdempotencyBase}:asset-builder:${component.builder_id}:${referenceId}`,
      },
    });
  }

  return { checkoutType, referenceId, libraryReady: true };
}

export function mapTransactionTypeToCheckout(
  transactionType: string | null | undefined
): 'escrow' | 'asset' | 'revision' | null {
  if (transactionType === 'component_purchase') return 'asset';
  if (transactionType === 'revision_purchase') return 'revision';
  if (
    transactionType === 'collab_milestone' ||
    transactionType === 'escrow_funding' ||
    transactionType === 'milestone_funding'
  ) {
    return 'escrow';
  }
  return null;
}
