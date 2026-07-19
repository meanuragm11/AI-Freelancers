/**
 * Data access for finance_reconciliation_runs and finance_reconciliation_items.
 * CRUD only — no business logic.
 *
 * Future integration: FinanceReconciliationService nightly job.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_TABLES } from '../constants';
import type {
  FinanceReconciliationItem,
  FinanceReconciliationItemInsert,
  FinanceReconciliationItemUpdate,
  FinanceReconciliationRun,
  FinanceReconciliationRunInsert,
  FinanceReconciliationRunUpdate,
} from '../types';

export class ReconciliationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findRunById(id: string): Promise<FinanceReconciliationRun | null> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.reconciliationRuns)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as FinanceReconciliationRun | null;
  }

  async listRuns(limit = 20): Promise<FinanceReconciliationRun[]> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.reconciliationRuns)
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as FinanceReconciliationRun[];
  }

  async insertRun(row: FinanceReconciliationRunInsert): Promise<FinanceReconciliationRun> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.reconciliationRuns)
      .insert(row)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceReconciliationRun;
  }

  async updateRun(
    id: string,
    patch: FinanceReconciliationRunUpdate
  ): Promise<FinanceReconciliationRun> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.reconciliationRuns)
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceReconciliationRun;
  }

  async listItemsByRun(runId: string): Promise<FinanceReconciliationItem[]> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.reconciliationItems)
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as FinanceReconciliationItem[];
  }

  async insertItem(row: FinanceReconciliationItemInsert): Promise<FinanceReconciliationItem> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.reconciliationItems)
      .insert(row)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceReconciliationItem;
  }

  async updateItem(
    id: string,
    patch: FinanceReconciliationItemUpdate
  ): Promise<FinanceReconciliationItem> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.reconciliationItems)
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceReconciliationItem;
  }
}
