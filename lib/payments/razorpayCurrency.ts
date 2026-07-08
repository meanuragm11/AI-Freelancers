const DEFAULT_CHECKOUT_CURRENCY = 'INR';
const DEFAULT_USD_INR_RATE = 83;

/** Checkout currency from env (USD or INR). Defaults to INR for Indian merchants. */
export function getRazorpayCheckoutCurrency(): string {
  const configured = (process.env.RAZORPAY_CHECKOUT_CURRENCY ?? DEFAULT_CHECKOUT_CURRENCY).trim();
  return configured.toUpperCase() || DEFAULT_CHECKOUT_CURRENCY;
}

export function isRazorpayInrCheckout(): boolean {
  return getRazorpayCheckoutCurrency() === 'INR';
}

/** USD → INR conversion rate for checkout when currency is INR. */
export function getRazorpayUsdInrRate(): number {
  const parsed = Number(process.env.RAZORPAY_USD_INR_RATE ?? String(DEFAULT_USD_INR_RATE));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_USD_INR_RATE;
}

/**
 * Convert a USD list price into Razorpay order amount + currency.
 * USD orders use cents; INR orders use paise after FX conversion.
 */
export function convertUsdToRazorpayCheckoutAmount(amountUsd: number): {
  currency: string;
  amountSmallestUnit: number;
} {
  const currency = getRazorpayCheckoutCurrency();

  if (currency === 'INR') {
    const amountInr = amountUsd * getRazorpayUsdInrRate();
    return {
      currency: 'INR',
      amountSmallestUnit: Math.round(amountInr * 100),
    };
  }

  return {
    currency: 'USD',
    amountSmallestUnit: Math.round(amountUsd * 100),
  };
}
