/**
 * Finance-layer escrow lifecycle states (V2 state machine).
 * Mirrors public.finance_escrow_status — distinct from legacy collab escrow columns.
 *
 * Future integration: EscrowFinanceService freeze/release/unfreeze.
 */

export enum EscrowStatus {
  Pending = 'pending',
  Funded = 'funded',
  Frozen = 'frozen',
  Released = 'released',
  Refunded = 'refunded',
  Cancelled = 'cancelled',
}

export const ESCROW_STATUSES = Object.values(EscrowStatus);
