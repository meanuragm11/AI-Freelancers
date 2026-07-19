/**
 * Double-entry direction for finance ledger lines.
 * Mirrors public.finance_direction.
 */

export enum FinanceDirection {
  Debit = 'debit',
  Credit = 'credit',
}

export const FINANCE_DIRECTIONS = Object.values(FinanceDirection);
