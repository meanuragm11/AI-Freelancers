import type Razorpay from 'razorpay';
import { getRazorpayClient } from '@/lib/payments/razorpayClient';
import { logRazorpayOrderEvent } from '@/lib/payments/razorpayOrderLog';

/** Do not reuse orders within 5 minutes of local expiry. */
export const RAZORPAY_ORDER_SAFE_EXPIRY_MS = 5 * 60 * 1000;

export type RazorpayOrderExpectation = {
  amountCents: number;
  currency: string;
  checkoutType: string;
  referenceId: string;
  userId: string;
  transactionType: string;
  platformFeeUsd: number;
  paymentExpiresAt?: string | null;
};

export type RazorpayOrderValidationResult = {
  valid: boolean;
  reason?: string;
  razorpayStatus?: string;
  hasCapturedPayment?: boolean;
};

type RazorpayOrderRecord = {
  id?: string;
  amount?: number;
  amount_due?: number;
  currency?: string;
  status?: string;
  key_id?: string | null;
  notes?: Record<string, string | undefined>;
};

type RazorpayPaymentRecord = {
  id?: string;
  status?: string;
};

function noteValue(notes: Record<string, string | undefined> | undefined, key: string) {
  return notes?.[key] ?? '';
}

function isWithinSafeExpiryThreshold(paymentExpiresAt?: string | null) {
  if (!paymentExpiresAt) return false;
  const expiresAtMs = Date.parse(paymentExpiresAt);
  if (!Number.isFinite(expiresAtMs)) return false;
  return expiresAtMs - Date.now() <= RAZORPAY_ORDER_SAFE_EXPIRY_MS;
}

function notesMatch(
  notes: Record<string, string | undefined> | undefined,
  expectation: RazorpayOrderExpectation
) {
  return (
    noteValue(notes, 'checkout_type') === expectation.checkoutType &&
    noteValue(notes, 'reference_id') === expectation.referenceId &&
    noteValue(notes, 'user_id') === expectation.userId &&
    noteValue(notes, 'transaction_type') === expectation.transactionType &&
    noteValue(notes, 'platform_fee_usd') === String(expectation.platformFeeUsd)
  );
}

export async function fetchRazorpayOrder(
  orderId: string,
  client: Razorpay = getRazorpayClient()
): Promise<RazorpayOrderRecord> {
  return (await client.orders.fetch(orderId)) as RazorpayOrderRecord;
}

export async function fetchCapturedPaymentForOrder(
  orderId: string,
  client: Razorpay = getRazorpayClient()
): Promise<RazorpayPaymentRecord | null> {
  const paymentsResponse = (await client.orders.fetchPayments(orderId)) as {
    items?: RazorpayPaymentRecord[];
  };

  return (
    (paymentsResponse.items ?? []).find(
      (payment) => payment.status === 'captured' || payment.status === 'authorized'
    ) ?? null
  );
}

export async function validateRazorpayOrderForReuse(
  orderId: string,
  expectation: RazorpayOrderExpectation,
  client: Razorpay = getRazorpayClient()
): Promise<RazorpayOrderValidationResult> {
  logRazorpayOrderEvent({
    event: 'order.validate.fetch',
    orderId,
    buyerId: expectation.userId,
    checkoutType: expectation.checkoutType,
    referenceId: expectation.referenceId,
    transactionType: expectation.transactionType,
  });

  if (isWithinSafeExpiryThreshold(expectation.paymentExpiresAt)) {
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'local_expiry_within_safe_threshold',
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
    });
    return result;
  }

  let order: RazorpayOrderRecord;
  try {
    order = await fetchRazorpayOrder(orderId, client);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'fetch_failed';
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'razorpay_fetch_failed',
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
      error: message,
    });
    return result;
  }

  const razorpayStatus = order.status ?? 'unknown';

  if (razorpayStatus === 'paid') {
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'order_already_paid',
      razorpayStatus,
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
      razorpayStatus,
    });
    return result;
  }

  if (razorpayStatus !== 'created') {
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'order_not_created',
      razorpayStatus,
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
      razorpayStatus,
    });
    return result;
  }

  let capturedPayment: RazorpayPaymentRecord | null = null;
  try {
    capturedPayment = await fetchCapturedPaymentForOrder(orderId, client);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'payments_fetch_failed';
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'razorpay_payments_fetch_failed',
      razorpayStatus,
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
      razorpayStatus,
      error: message,
    });
    return result;
  }

  if (capturedPayment) {
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'order_has_captured_payment',
      razorpayStatus,
      hasCapturedPayment: true,
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
      razorpayStatus,
      hasCapturedPayment: true,
    });
    return result;
  }

  if (order.amount !== expectation.amountCents) {
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'amount_mismatch',
      razorpayStatus,
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
      razorpayStatus,
      metadata: { expectedAmountCents: expectation.amountCents, actualAmountCents: order.amount },
    });
    return result;
  }

  if ((order.currency ?? '').toUpperCase() !== expectation.currency.toUpperCase()) {
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'currency_mismatch',
      razorpayStatus,
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
      razorpayStatus,
      metadata: { expectedCurrency: expectation.currency, actualCurrency: order.currency },
    });
    return result;
  }

  if (!notesMatch(order.notes, expectation)) {
    const result: RazorpayOrderValidationResult = {
      valid: false,
      reason: 'notes_mismatch',
      razorpayStatus,
    };
    logRazorpayOrderEvent({
      event: 'order.validate.result',
      orderId,
      buyerId: expectation.userId,
      valid: false,
      reason: result.reason,
      razorpayStatus,
      metadata: { notes: order.notes ?? {} },
    });
    return result;
  }

  const result: RazorpayOrderValidationResult = {
    valid: true,
    razorpayStatus,
    hasCapturedPayment: false,
  };

  logRazorpayOrderEvent({
    event: 'order.validate.result',
    orderId,
    buyerId: expectation.userId,
    valid: true,
    razorpayStatus,
    hasCapturedPayment: false,
  });

  return result;
}
