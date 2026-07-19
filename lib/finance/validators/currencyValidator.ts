/**
 * Currency code validation for Finance V2.
 *
 * Future integration: checkout service, payout engine multi-currency support.
 */

import { DEFAULT_CURRENCY } from '../constants';
import { isSupportedCurrency, normalizeCurrency } from '../utils';
import { FinanceValidationError } from './moneyValidator';

export const CurrencyValidator = {
  normalize(code: unknown): string {
    return normalizeCurrency(code);
  },

  requireSupported(code: unknown, field = 'currency'): string {
    if (typeof code !== 'string' || !code.trim()) {
      throw new FinanceValidationError(`${field} is required`, field);
    }
    const upper = code.trim().toUpperCase();
    if (!isSupportedCurrency(upper)) {
      throw new FinanceValidationError(
        `${field} must be a supported currency (e.g. ${DEFAULT_CURRENCY})`,
        field
      );
    }
    return upper;
  },
};
