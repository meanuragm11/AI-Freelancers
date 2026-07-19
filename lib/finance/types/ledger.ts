/**
 * Row types for finance_ledger_entries.
 * Mirrors DB schema — used by LedgerRepository and FinanceLedgerService.
 *
 * Future integration: dual-write from fulfillRazorpayPayment, milestone accept.
 */

import type { FinanceAccountType, FinanceDirection, LedgerEntryType } from '../enums';

export interface FinanceLedgerEntry {
  id: string;
  entry_type: LedgerEntryType;
  direction: FinanceDirection;
  account_type: FinanceAccountType;
  buyer_id: string | null;
  builder_id: string | null;
  collab_id: string | null;
  milestone_id: string | null;
  transaction_id: string | null;
  invoice_id: string | null;
  refund_request_id: string | null;
  withdrawal_id: string | null;
  dispute_id: string | null;
  currency: string;
  gross_amount_usd: number;
  platform_fee_usd: number;
  tax_amount_usd: number;
  net_amount_usd: number;
  payment_provider: string | null;
  provider_reference: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type FinanceLedgerEntryInsert = Omit<FinanceLedgerEntry, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

/** Ledger is append-only — no row updates permitted. */
export type FinanceLedgerEntryUpdate = never;

export interface FinanceLedgerEntryFilters {
  buyer_id?: string;
  builder_id?: string;
  collab_id?: string;
  transaction_id?: string;
  entry_type?: LedgerEntryType;
  limit?: number;
  offset?: number;
}
