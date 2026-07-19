/**
 * Data access for finance_events (append-only).
 * CRUD only — no business logic.
 *
 * Future integration: FinanceEventService, founder finance timeline.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_DEFAULT_PAGE_SIZE, FINANCE_TABLES } from '../constants';
import type { FinanceEvent, FinanceEventFilters, FinanceEventInsert } from '../types';

export class FinanceEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<FinanceEvent | null> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.events)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as FinanceEvent | null;
  }

  async list(filters: FinanceEventFilters = {}): Promise<FinanceEvent[]> {
    const limit = filters.limit ?? FINANCE_DEFAULT_PAGE_SIZE;
    let query = this.client
      .from(FINANCE_TABLES.events)
      .select('*')
      .order('created_at', { ascending: false })
      .range(filters.offset ?? 0, (filters.offset ?? 0) + limit - 1);

    if (filters.event_type) query = query.eq('event_type', filters.event_type);
    if (filters.collab_id) query = query.eq('collab_id', filters.collab_id);
    if (filters.transaction_id) query = query.eq('transaction_id', filters.transaction_id);
    if (filters.buyer_id) query = query.eq('buyer_id', filters.buyer_id);
    if (filters.builder_id) query = query.eq('builder_id', filters.builder_id);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as FinanceEvent[];
  }

  async insert(row: FinanceEventInsert): Promise<FinanceEvent> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.events)
      .insert(row)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceEvent;
  }
}
