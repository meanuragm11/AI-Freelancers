import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { fulfillRazorpayPayment } from '@/lib/payments/fulfillRazorpayPayment';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyText)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid Razorpay signature detected.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentData = event.payload.payment?.entity ?? event.payload.order?.entity;
      const notes = paymentData.notes ?? {};
      const checkoutType = notes.checkout_type as 'escrow' | 'asset' | 'revision' | undefined;
      const referenceId = notes.reference_id as string | undefined;
      const userId = notes.user_id as string | undefined;
      const orderId = paymentData.order_id as string | undefined;
      const paymentId = paymentData.id as string | undefined;

      if (!checkoutType || !referenceId || !orderId || !paymentId) {
        throw new Error('Webhook payload missing required payment notes.');
      }

      console.log(`Payment captured: ${checkoutType} - ${referenceId}`);

      await fulfillRazorpayPayment(
        {
          checkoutType,
          referenceId,
          userId: userId || '',
          orderId,
          paymentId,
        },
        supabaseAdmin
      );
    }

    return NextResponse.json({ status: 'success', message: 'Webhook processed' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Webhook Processing Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
