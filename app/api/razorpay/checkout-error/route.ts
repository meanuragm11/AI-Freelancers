import { NextResponse } from 'next/server';
import { logRazorpayOrderEvent } from '@/lib/payments/razorpayOrderLog';

type CheckoutErrorPayload = {
  orderId?: string;
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    source?: string;
    step?: string;
    metadata?: Record<string, unknown>;
  };
};

export async function POST(req: Request) {
  try {
    const { orderId, error } = (await req.json()) as CheckoutErrorPayload;

    logRazorpayOrderEvent({
      event: 'checkout.failed',
      orderId,
      error: error?.description ?? error?.reason ?? error?.code ?? 'checkout_failed',
      metadata: {
        scope: 'razorpay.checkout',
        code: error?.code,
        reason: error?.reason,
        source: error?.source,
        step: error?.step,
        ...(error?.metadata ?? {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to log checkout error';
    console.error('[RazorpayCheckoutError]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
