/**
 * Reconciliation run and item status values.
 * Mirrors public.finance_reconciliation_status.
 *
 * Future integration: FinanceReconciliationService start/complete, nightly cron.
 */

export enum ReconciliationStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
}

export const RECONCILIATION_STATUSES = Object.values(ReconciliationStatus);
