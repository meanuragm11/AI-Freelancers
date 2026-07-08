import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { fetchRazorpayOrder } from '@/lib/payments/razorpayOrderValidation';
import {
  getConfiguredRazorpayKeyId,
  resolveRazorpayCheckoutKeyId,
} from '@/lib/payments/razorpayCheckoutKey';
import { logRazorpayOrderEvent } from '@/lib/payments/razorpayOrderLog';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = new URL(req.url).searchParams.get('orderId')?.trim();
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const configuredKeyId = getConfiguredRazorpayKeyId();
    if (!configuredKeyId) {
      return NextResponse.json(
        { error: 'Payment gateway is not configured. Missing Razorpay key.' },
        { status: 503 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('id, buyer_id, order_id, status')
      .eq('order_id', orderId)
      .maybeSingle();

    if (transactionError) throw transactionError;
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found for this order' }, { status: 404 });
    }
    if (transaction.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const order = await fetchRazorpayOrder(orderId);
    const checkoutKeyId = resolveRazorpayCheckoutKeyId(order);
    const orderKeyId = order.key_id?.trim() ?? null;
    const keyMatch =
      !orderKeyId ||
      orderKeyId === configuredKeyId ||
      checkoutKeyId === configuredKeyId;

    const response = {
      success: true,
      orderId: order.id ?? orderId,
      amount: order.amount ?? 0,
      amountDue: order.amount_due ?? order.amount ?? 0,
      currency: (order.currency ?? 'INR').toUpperCase(),
      status: order.status ?? 'unknown',
      keyId: checkoutKeyId,
      configuredKeyId,
      orderKeyId,
      keyMatch,
      transactionStatus: transaction.status,
    };

    logRazorpayOrderEvent({
      event: 'order.validate.fetch',
      orderId,
      buyerId: user.id,
      metadata: {
        scope: 'razorpay.preflight',
        preflight: response,
        razorpayOrder: {
          id: order.id,
          amount: order.amount,
          amount_due: order.amount_due,
          currency: order.currency,
          status: order.status,
          key_id: orderKeyId,
        },
      },
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Preflight check failed';
    console.error('[RazorpayPreflight]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
