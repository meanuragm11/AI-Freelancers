/**
 * Money amount validation for Finance V2 writes.
 *
 * Future integration: all service-layer entry points before repository calls.
 */

import { assertNonNegativeMoney, assertPositiveMoney, parseMoney, roundMoney } from '../utils';

export class FinanceValidationError extends Error {
  readonly field: string;

  constructor(message: string, field = 'amount') {
    super(message);
    this.name = 'FinanceValidationError';
    this.field = field;
  }
}

export const MoneyValidator = {
  parse(value: unknown): number | null {
    return parseMoney(value);
  },

  requirePositive(value: unknown, field = 'amount'): number {
    try {
      return assertPositiveMoney(value, field);
    } catch {
      throw new FinanceValidationError(`${field} must be a positive number`, field);
    }
  },

  requireNonNegative(value: unknown, field = 'amount'): number {
    try {
      return assertNonNegativeMoney(value, field);
    } catch {
      throw new FinanceValidationError(`${field} must be a non-negative number`, field);
    }
  },

  requireBalanced(gross: number, platformFee: number, tax: number, net: number): void {
    const expected = roundMoney(Math.max(0, gross - platformFee - tax));
    if (roundMoney(net) !== expected) {
      throw new FinanceValidationError(
        `net amount ${net} does not match gross - fees - tax (expected ${expected})`,
        'net_amount_usd'
      );
    }
  },
};
