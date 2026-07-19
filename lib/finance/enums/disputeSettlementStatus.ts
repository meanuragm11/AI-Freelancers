/**
 * Dispute settlement outcomes tracked in the finance layer.
 * Mirrors public.finance_dispute_settlement_status.
 *
 * Future integration: dispute resolution + ledger dispute_settlement entries.
 */

export enum DisputeSettlementStatus {
  Pending = 'pending',
  InReview = 'in_review',
  SettledBuyer = 'settled_buyer',
  SettledBuilder = 'settled_builder',
  Split = 'split',
  Cancelled = 'cancelled',
}

export const DISPUTE_SETTLEMENT_STATUSES = Object.values(DisputeSettlementStatus);
