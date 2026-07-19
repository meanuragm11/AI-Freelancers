/**
 * Data access for finance_payouts.
 * CRUD only — no business logic.
 *
 * Future integration: FinancePayoutService, milestone accept payout queue.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_DEFAULT_PAGE_SIZE, FINANCE_TABLES } from '../constants';
import type {
  FinancePayout,
  FinancePayoutFilters,
  FinancePayoutInsert,
  FinancePayoutUpdate,
} from '../types';

export class PayoutRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<FinancePayout | null> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.payouts)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as FinancePayout | null;
  }

  async list(filters: FinancePayoutFilters = {}): Promise<FinancePayout[]> {
    const limit = filters.limit ?? FINANCE_DEFAULT_PAGE_SIZE;
    let query = this.client
      .from(FINANCE_TABLES.payouts)
      .select('*')
      .order('created_at', { ascending: false })
      .range(filters.offset ?? 0, (filters.offset ?? 0) + limit - 1);

    if (filters.builder_id) query = query.eq('builder_id', filters.builder_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.invoice_id) query = query.eq('invoice_id', filters.invoice_id);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as FinancePayout[];
  }

  async insert(row: FinancePayoutInsert): Promise<FinancePayout> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.payouts)
      .insert(row)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayout;
  }

  async update(id: string, patch: FinancePayoutUpdate): Promise<FinancePayout> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.payouts)
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayout;
  }
}
