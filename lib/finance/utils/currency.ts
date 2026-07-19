/**
 * Currency code normalization for Finance V2.
 *
 * Future integration: Razorpay order creation, multi-currency expansion.
 */

import { DEFAULT_CURRENCY } from '../constants';

const SUPPORTED_CURRENCIES = new Set(['USD', 'INR']);

/** Uppercase and validate a currency code; defaults to USD when unknown. */
export function normalizeCurrency(code: unknown): string {
  if (typeof code !== 'string' || !code.trim()) {
    return DEFAULT_CURRENCY;
  }
  const upper = code.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(upper) ? upper : DEFAULT_CURRENCY;
}

/** Returns true when the currency is explicitly supported. */
export function isSupportedCurrency(code: unknown): boolean {
  if (typeof code !== 'string' || !code.trim()) return false;
  return SUPPORTED_CURRENCIES.has(code.trim().toUpperCase());
}

export { SUPPORTED_CURRENCIES };
