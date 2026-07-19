/**
 * USD amount parsing, rounding, and display formatting.
 *
 * Future integration: all Finance V2 services before persisting amounts.
 */

import { FINANCE_AMOUNT_PRECISION } from '../constants';

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: FINANCE_AMOUNT_PRECISION,
});

/** Round to finance-layer precision (4 decimal places). */
export function roundMoney(amount: number): number {
  const factor = 10 ** FINANCE_AMOUNT_PRECISION;
  return Math.round(amount * factor) / factor;
}

/** Parse a numeric input; returns null when not a finite number. */
export function parseMoney(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return roundMoney(parsed);
}

/** Assert a positive money amount; throws on invalid input. */
export function assertPositiveMoney(value: unknown, field = 'amount'): number {
  const parsed = parseMoney(value);
  if (parsed === null || parsed <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
  return parsed;
}

/** Assert a non-negative money amount; throws on invalid input. */
export function assertNonNegativeMoney(value: unknown, field = 'amount'): number {
  const parsed = parseMoney(value);
  if (parsed === null || parsed < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return parsed;
}

/** Format USD for display in dashboards and logs. */
export function formatUsd(amount: number): string {
  return USD_FORMATTER.format(roundMoney(amount));
}

/** Compute net = gross - platform_fee - tax, clamped at zero. */
export function computeNetAmount(
  gross: number,
  platformFee = 0,
  tax = 0
): number {
  return roundMoney(Math.max(0, gross - platformFee - tax));
}
