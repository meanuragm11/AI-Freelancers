/**
 * Production table names for read-layer shadow aggregation.
 * Used when finance V2 tables are empty or incomplete.
 *
 * DO NOT use for writes — read layer only.
 */

export const PRODUCTION_TABLES = {
  transactions: 'transactions',
  invoices: 'invoices',
  refundRequests: 'refund_requests',
  disputes: 'disputes',
  builderWithdrawals: 'builder_withdrawals',
  builderPayoutMethods: 'builder_payout_methods',
  collabs: 'collabs',
  milestones: 'milestones',
  escrowTransactions: 'escrow_transactions',
  profiles: 'profiles',
} as const;

/** Active refund statuses requiring founder/builder action. */
export const ACTIVE_REFUND_STATUSES = [
  'requested',
  'builder_responded',
  'founder_review',
  'approved',
  'processing',
] as const;

/** Open dispute statuses mapped to queue filters. */
export const OPEN_DISPUTE_STATUSES = [
  'waiting_for_freelancer',
  'waiting_for_buyer',
  'negotiation',
  'under_review',
  'arbitration_requested',
] as const;

/** Withdrawal statuses treated as pending payout action. */
export const PENDING_WITHDRAWAL_STATUSES = ['processing'] as const;

/** Invoice statuses awaiting payout. */
export const PENDING_INVOICE_STATUSES = ['processing'] as const;

/** Default escrow age threshold for health checks (days). */
export const DEFAULT_ESCROW_AGE_DAYS = 30;

/** Default refund pending threshold for health checks (days). */
export const DEFAULT_REFUND_PENDING_DAYS = 7;
