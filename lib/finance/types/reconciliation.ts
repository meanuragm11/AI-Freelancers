/**
 * Row types for finance_reconciliation_runs and finance_reconciliation_items.
 *
 * Future integration: nightly Razorpay vs ledger reconciliation job.
 */

import type { ReconciliationStatus } from '../enums';

export interface FinanceReconciliationRun {
  id: string;
  status: ReconciliationStatus;
  started_at: string;
  completed_at: string | null;
  summary_json: Record<string, unknown>;
}

export type FinanceReconciliationRunInsert = Omit<
  FinanceReconciliationRun,
  'id' | 'started_at' | 'completed_at'
> & {
  id?: string;
  started_at?: string;
  completed_at?: string | null;
};

export type FinanceReconciliationRunUpdate = Partial<
  Pick<FinanceReconciliationRun, 'status' | 'completed_at' | 'summary_json'>
>;

export interface FinanceReconciliationItem {
  id: string;
  run_id: string;
  transaction_id: string | null;
  ledger_entry_id: string | null;
  status: ReconciliationStatus;
  difference: number;
  remarks: string | null;
  created_at: string;
}

export type FinanceReconciliationItemInsert = Omit<FinanceReconciliationItem, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type FinanceReconciliationItemUpdate = Partial<
  Pick<FinanceReconciliationItem, 'status' | 'difference' | 'remarks'>
>;
