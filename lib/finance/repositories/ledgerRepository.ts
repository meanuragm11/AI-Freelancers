/**
 * Data access for finance_ledger_entries (append-only).
 * CRUD only — no business logic. Accepts SupabaseClient via constructor for DI.
 *
 * Future integration: FinanceLedgerService, reconciliation item linking.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_DEFAULT_PAGE_SIZE, FINANCE_TABLES } from '../constants';
import type {
  FinanceLedgerEntry,
  FinanceLedgerEntryFilters,
  FinanceLedgerEntryInsert,
} from '../types';

export class LedgerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<FinanceLedgerEntry | null> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as FinanceLedgerEntry | null;
  }

  async findByIdempotencyKey(key: string): Promise<FinanceLedgerEntry | null> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();

    if (error) throw error;
    return data as FinanceLedgerEntry | null;
  }

  async list(filters: FinanceLedgerEntryFilters = {}): Promise<FinanceLedgerEntry[]> {
    const limit = filters.limit ?? FINANCE_DEFAULT_PAGE_SIZE;
    let query = this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('*')
      .order('created_at', { ascending: false })
      .range(filters.offset ?? 0, (filters.offset ?? 0) + limit - 1);

    if (filters.buyer_id) query = query.eq('buyer_id', filters.buyer_id);
    if (filters.builder_id) query = query.eq('builder_id', filters.builder_id);
    if (filters.collab_id) query = query.eq('collab_id', filters.collab_id);
    if (filters.transaction_id) query = query.eq('transaction_id', filters.transaction_id);
    if (filters.entry_type) query = query.eq('entry_type', filters.entry_type);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as FinanceLedgerEntry[];
  }

  async insert(row: FinanceLedgerEntryInsert): Promise<FinanceLedgerEntry> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .insert(row)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceLedgerEntry;
  }
}
