/**
 * Builder payout lifecycle for Finance V2 payout engine.
 * Mirrors public.finance_payout_status.
 *
 * Future integration: FinancePayoutService create/complete, withdrawal workflow.
 */

export enum PayoutStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export const PAYOUT_STATUSES = Object.values(PayoutStatus);
