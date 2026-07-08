export type RazorpayOrderLogEvent =
  | 'order.create.start'
  | 'order.create.success'
  | 'order.create.failed'
  | 'order.reuse.attempt'
  | 'order.reuse.success'
  | 'order.reuse.rejected'
  | 'order.reuse.expired'
  | 'order.validate.fetch'
  | 'order.validate.result'
  | 'order.force_refresh'
  | 'checkout.failed';

export type RazorpayOrderLogPayload = {
  event: RazorpayOrderLogEvent;
  buyerId?: string;
  orderId?: string;
  transactionId?: string;
  checkoutType?: string;
  referenceId?: string;
  transactionType?: string;
  amountUsd?: number;
  platformFeeUsd?: number;
  reused?: boolean;
  forceRefresh?: boolean;
  valid?: boolean;
  reason?: string;
  razorpayStatus?: string;
  hasCapturedPayment?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
};

/** Structured JSON log line for Razorpay order lifecycle events. */
export function logRazorpayOrderEvent(payload: RazorpayOrderLogPayload) {
  const entry = {
    scope: 'razorpay.order',
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (payload.event.endsWith('.failed') || payload.valid === false) {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.info(JSON.stringify(entry));
}
