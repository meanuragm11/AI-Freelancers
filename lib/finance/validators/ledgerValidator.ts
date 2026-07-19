/**
 * Ledger entry field validation before append-only inserts.
 *
 * Future integration: FinanceLedgerService.recordLedgerEntry().
 */

import {
  FINANCE_ACCOUNT_TYPES,
  FINANCE_DIRECTIONS,
  LEDGER_ENTRY_TYPES,
  type FinanceAccountType,
  type FinanceDirection,
  type LedgerEntryType,
} from '../enums';
import type { FinanceLedgerEntryInsert } from '../types';
import { CurrencyValidator } from './currencyValidator';
import { FinanceValidationError } from './moneyValidator';
import { MoneyValidator } from './moneyValidator';

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new FinanceValidationError(`${field} is invalid`, field);
  }
  return value as T;
}

export const LedgerValidator = {
  validateInsert(entry: FinanceLedgerEntryInsert): FinanceLedgerEntryInsert {
    const entryType = requireEnum(entry.entry_type, LEDGER_ENTRY_TYPES, 'entry_type');
    const direction = requireEnum(entry.direction, FINANCE_DIRECTIONS, 'direction');
    const accountType = requireEnum(entry.account_type, FINANCE_ACCOUNT_TYPES, 'account_type');

    if (!entry.idempotency_key?.trim()) {
      throw new FinanceValidationError('idempotency_key is required', 'idempotency_key');
    }

    const gross = MoneyValidator.requireNonNegative(entry.gross_amount_usd, 'gross_amount_usd');
    const platformFee = MoneyValidator.requireNonNegative(
      entry.platform_fee_usd,
      'platform_fee_usd'
    );
    const tax = MoneyValidator.requireNonNegative(entry.tax_amount_usd, 'tax_amount_usd');
    const net = MoneyValidator.requireNonNegative(entry.net_amount_usd, 'net_amount_usd');
    MoneyValidator.requireBalanced(gross, platformFee, tax, net);

    const currency = CurrencyValidator.requireSupported(entry.currency);

    return {
      ...entry,
      entry_type: entryType as LedgerEntryType,
      direction: direction as FinanceDirection,
      account_type: accountType as FinanceAccountType,
      currency,
      gross_amount_usd: gross,
      platform_fee_usd: platformFee,
      tax_amount_usd: tax,
      net_amount_usd: net,
      metadata: entry.metadata ?? {},
    };
  },
};
