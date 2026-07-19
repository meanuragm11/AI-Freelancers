/**
 * Immutable finance event taxonomy for audit and dashboard timelines.
 * Mirrors public.finance_event_type.
 *
 * Future integration: webhook processor, milestone accept, refund pipeline.
 */

export enum FinanceEventType {
  PaymentCaptured = 'payment_captured',
  EscrowFunded = 'escrow_funded',
  EscrowReleased = 'escrow_released',
  EscrowFrozen = 'escrow_frozen',
  EscrowUnfrozen = 'escrow_unfrozen',
  RefundRequested = 'refund_requested',
  RefundCompleted = 'refund_completed',
  PayoutCreated = 'payout_created',
  PayoutCompleted = 'payout_completed',
  WithdrawalRequested = 'withdrawal_requested',
  WithdrawalCompleted = 'withdrawal_completed',
  DisputeOpened = 'dispute_opened',
  DisputeSettled = 'dispute_settled',
  ReconciliationStarted = 'reconciliation_started',
  ReconciliationCompleted = 'reconciliation_completed',
  LedgerEntryRecorded = 'ledger_entry_recorded',
}

export const FINANCE_EVENT_TYPES = Object.values(FinanceEventType);
