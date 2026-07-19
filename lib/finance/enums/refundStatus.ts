/**
 * Finance-layer refund processing states.
 * Mirrors public.finance_refund_status — complements refund_requests.status.
 *
 * Future integration: FinanceLedgerService.recordRefund().
 */

export enum RefundStatus {
  Requested = 'requested',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export const REFUND_STATUSES = Object.values(RefundStatus);
