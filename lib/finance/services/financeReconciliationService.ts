/**
 * Razorpay vs ledger reconciliation orchestration.
 * No scheduled job wired in Phase 1.
 *
 * Future integration points:
 * - Nightly cron: startReconciliation → compare transactions vs ledger
 * - Founder finance health dashboard: completeReconciliation summary
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { RECONCILIATION_ENABLED } from '../constants';
import { FinanceEventType, ReconciliationStatus } from '../enums';
import { ReconciliationRepository } from '../repositories';
import type {
  FinanceReconciliationItemInsert,
  FinanceReconciliationRun,
} from '../types';
import { StateTransitionValidator } from '../validators';
import { nowIso } from '../utils';
import { FinanceEventService } from './financeEventService';

export type ReconciliationItemInput = Omit<
  FinanceReconciliationItemInsert,
  'run_id' | 'status'
> & {
  status?: ReconciliationStatus;
};

export class FinanceReconciliationService {
  private readonly reconRepo: ReconciliationRepository;
  private readonly eventService: FinanceEventService;

  constructor(client: SupabaseClient) {
    this.reconRepo = new ReconciliationRepository(client);
    this.eventService = new FinanceEventService(client);
  }

  /**
   * Begin a reconciliation run. Invoke from scheduled job when RECONCILIATION_ENABLED.
   */
  async startReconciliation(
    summarySeed: Record<string, unknown> = {}
  ): Promise<FinanceReconciliationRun | null> {
    if (!RECONCILIATION_ENABLED) return null;

    const run = await this.reconRepo.insertRun({
      status: ReconciliationStatus.Running,
      summary_json: summarySeed,
    });

    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.ReconciliationStarted,
      actor_id: null,
      buyer_id: null,
      builder_id: null,
      collab_id: null,
      milestone_id: null,
      transaction_id: null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: { run_id: run.id },
    });

    return run;
  }

  /**
   * Append a discrepancy item to an active run.
   */
  async addReconciliationItem(
    runId: string,
    item: ReconciliationItemInput
  ): Promise<void> {
    if (!RECONCILIATION_ENABLED) return;

    await this.reconRepo.insertItem({
      run_id: runId,
      transaction_id: item.transaction_id ?? null,
      ledger_entry_id: item.ledger_entry_id ?? null,
      status: item.status ?? ReconciliationStatus.Pending,
      difference: item.difference ?? 0,
      remarks: item.remarks ?? null,
    });
  }

  /**
   * Finalize a reconciliation run with summary metrics.
   */
  async completeReconciliation(
    runId: string,
    summary: Record<string, unknown>
  ): Promise<FinanceReconciliationRun | null> {
    if (!RECONCILIATION_ENABLED) return null;

    const existing = await this.reconRepo.findRunById(runId);
    if (!existing) return null;

    StateTransitionValidator.reconciliation(existing.status, ReconciliationStatus.Completed);

    const updated = await this.reconRepo.updateRun(runId, {
      status: ReconciliationStatus.Completed,
      completed_at: nowIso(),
      summary_json: summary,
    });

    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.ReconciliationCompleted,
      actor_id: null,
      buyer_id: null,
      builder_id: null,
      collab_id: null,
      milestone_id: null,
      transaction_id: null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: { run_id: runId, ...summary },
    });

    return updated;
  }
}
