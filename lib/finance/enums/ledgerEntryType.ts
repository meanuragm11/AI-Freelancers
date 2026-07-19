/**
 * Finance V2 ledger entry classification.
 * Mirrors public.finance_ledger_entry_type — use enum values, never raw strings.
 *
 * Future integration: fulfillRazorpayPayment, milestone accept, refunds, withdrawals.
 */

export enum LedgerEntryType {
  EscrowDeposit = 'escrow_deposit',
  EscrowRelease = 'escrow_release',
  EscrowRefund = 'escrow_refund',
  PlatformFee = 'platform_fee',
  Payout = 'payout',
  Withdrawal = 'withdrawal',
  Refund = 'refund',
  Adjustment = 'adjustment',
  DisputeSettlement = 'dispute_settlement',
  ComponentSale = 'component_sale',
  MilestoneRelease = 'milestone_release',
}

export const LEDGER_ENTRY_TYPES = Object.values(LedgerEntryType);
