/**
 * Finance V2 table name constants for repositories.
 * Keeps Supabase `.from()` calls centralized and refactor-safe.
 */

export const FINANCE_TABLES = {
  ledgerEntries: 'finance_ledger_entries',
  events: 'finance_events',
  payouts: 'finance_payouts',
  reconciliationRuns: 'finance_reconciliation_runs',
  reconciliationItems: 'finance_reconciliation_items',
} as const;

/** Maximum decimal places for USD amounts in the finance layer. */
export const FINANCE_AMOUNT_PRECISION = 4;

/** Default page size for ledger/event list queries. */
export const FINANCE_DEFAULT_PAGE_SIZE = 50;
