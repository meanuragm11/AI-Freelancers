/** Checkout must use the same key that created the order when Razorpay exposes it. */
export function resolveRazorpayCheckoutKeyId(order?: unknown): string {
  const orderKeyId =
    order &&
    typeof order === 'object' &&
    'key_id' in order &&
    typeof (order as { key_id?: unknown }).key_id === 'string'
      ? (order as { key_id: string }).key_id.trim()
      : '';
  if (orderKeyId) {
    return orderKeyId;
  }

  const envKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  if (!envKeyId) {
    throw new Error('Payment gateway is not configured. Missing Razorpay key.');
  }

  return envKeyId;
}

export function getConfiguredRazorpayKeyId(): string | null {
  const envKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  return envKeyId || null;
}
