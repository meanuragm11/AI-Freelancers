/**
 * Row types for finance_payouts.
 *
 * Future integration: milestone accept payout trigger, withdrawal engine.
 */

import type { PayoutStatus } from '../enums';

export interface FinancePayout {
  id: string;
  builder_id: string;
  invoice_id: string | null;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  currency: string;
  status: PayoutStatus;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

export type FinancePayoutInsert = Omit<
  FinancePayout,
  'id' | 'created_at' | 'processed_by' | 'processed_at'
> & {
  id?: string;
  processed_by?: string | null;
  processed_at?: string | null;
  created_at?: string;
};

export type FinancePayoutUpdate = Partial<
  Pick<
    FinancePayout,
    'status' | 'payment_method' | 'reference' | 'notes' | 'processed_by' | 'processed_at'
  >
>;

export interface FinancePayoutFilters {
  builder_id?: string;
  status?: PayoutStatus;
  invoice_id?: string;
  limit?: number;
  offset?: number;
}
