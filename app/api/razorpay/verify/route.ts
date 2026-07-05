import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import {
  fulfillRazorpayPayment,
  mapTransactionTypeToCheckout,
} from '@/lib/payments/fulfillRazorpayPayment';

type VerifyPayload = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      (await req.json()) as VerifyPayload;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 });
    }

    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('id, buyer_id, item_id, transaction_type, status, metadata')
      .eq('order_id', razorpay_order_id)
      .maybeSingle();

    if (transactionError) throw transactionError;
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found for this order' }, { status: 404 });
    }

    if (transaction.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const checkoutType =
      mapTransactionTypeToCheckout(transaction.transaction_type) ??
      mapTransactionTypeToCheckout(
        (transaction.metadata as Record<string, unknown> | null)?.checkoutType as string | undefined
      );

    if (!checkoutType) {
      return NextResponse.json({ error: 'Unsupported transaction type' }, { status: 400 });
    }

    if (transaction.status === 'completed') {
      return NextResponse.json({
        success: true,
        alreadyFulfilled: true,
        checkoutType,
        referenceId: transaction.item_id,
      });
    }

    const result = await fulfillRazorpayPayment({
      checkoutType,
      referenceId: transaction.item_id,
      userId: user.id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      transactionId: transaction.id,
    });

    return NextResponse.json({
      success: true,
      ...(typeof result === 'object' && result !== null ? result : {}),
      checkoutType,
      referenceId: transaction.item_id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    console.error('Razorpay verify error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
