/**
 * Ledger domain module — re-exports ledger types, repository, and service.
 *
 * Future integration: import from @/lib/finance/ledger in payment hooks.
 */

export type {
  FinanceLedgerEntry,
  FinanceLedgerEntryInsert,
  FinanceLedgerEntryFilters,
} from '../types';
export { LedgerRepository } from '../repositories';
export { FinanceLedgerService } from '../services';
