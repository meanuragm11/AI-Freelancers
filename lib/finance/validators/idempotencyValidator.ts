/**
 * Idempotency key validation and duplicate detection helpers.
 *
 * Future integration: webhook dedupe, fulfillRazorpayPayment shared keys.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_TABLES } from '../constants';
import { FinanceValidationError } from './moneyValidator';

export const IdempotencyValidator = {
  requireKey(key: unknown, field = 'idempotency_key'): string {
    if (typeof key !== 'string' || !key.trim()) {
      throw new FinanceValidationError(`${field} is required`, field);
    }
    if (key.length > 512) {
      throw new FinanceValidationError(`${field} exceeds maximum length`, field);
    }
    return key.trim();
  },

  /** Returns existing ledger row id when key already used; null when available. */
  async findExistingLedgerEntry(
    client: SupabaseClient,
    idempotencyKey: string
  ): Promise<string | null> {
    const { data, error } = await client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) {
      throw new FinanceValidationError(`Idempotency lookup failed: ${error.message}`, 'idempotency_key');
    }
    return data?.id ?? null;
  },
};
