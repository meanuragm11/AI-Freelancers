/**
 * FinanceHealthReadService
 *
 * Purpose: Surface actionable finance health issues for founder ops alerts.
 * Responsibilities: Run batched diagnostic queries across finance V2 and production tables;
 *   return FinanceHealthDto with prioritized issue list (no auto-remediation).
 * Future integration: GET /api/finance/health, /founder/finance health banner.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_TABLES } from '../../constants';
import { PayoutStatus, ReconciliationStatus } from '../../enums';
import { daysAgoIso, nowIso } from '../../utils/dates';
import type { FinanceHealthDto, FinanceHealthIssueDto } from '../shared/dto/health';
import type { FinanceHealthOptions } from '../shared/filters';
import {
  ACTIVE_REFUND_STATUSES,
  DEFAULT_ESCROW_AGE_DAYS,
  DEFAULT_REFUND_PENDING_DAYS,
  OPEN_DISPUTE_STATUSES,
  PRODUCTION_TABLES,
} from '../shared/productionTables';

export class FinanceHealthReadService {
  constructor(private readonly client: SupabaseClient) {}

  async getHealth(options: FinanceHealthOptions = {}): Promise<FinanceHealthDto> {
    const escrowAgeDays = options.escrowAgeDays ?? DEFAULT_ESCROW_AGE_DAYS;
    const refundPendingDays = options.refundPendingDays ?? DEFAULT_REFUND_PENDING_DAYS;
    const maxIssues = options.maxIssues ?? 100;
    const generatedAt = nowIso();

    const [
      missingPayoutProfiles,
      agedEscrows,
      staleRefunds,
      failedPayouts,
      missingInvoices,
      duplicateKeys,
      reconciliationMismatches,
      missingPayoutReferences,
    ] = await Promise.all([
      this.findMissingPayoutProfiles(),
      this.findAgedEscrows(escrowAgeDays),
      this.findStaleRefunds(refundPendingDays),
      this.findFailedPayouts(),
      this.findMissingInvoices(),
      this.findDuplicateIdempotencyKeys(),
      this.findReconciliationMismatches(),
      this.findMissingPayoutReferences(),
    ]);

    const issues: FinanceHealthIssueDto[] = [
      ...missingPayoutProfiles,
      ...agedEscrows,
      ...staleRefunds,
      ...failedPayouts,
      ...missingInvoices,
      ...duplicateKeys,
      ...reconciliationMismatches,
      ...missingPayoutReferences,
    ]
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .slice(0, maxIssues);

    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    let overallStatus: FinanceHealthDto['overallStatus'] = 'healthy';
    if (criticalCount > 0) overallStatus = 'critical';
    else if (warningCount > 0) overallStatus = 'degraded';

    return {
      issues,
      issueCount: issues.length,
      criticalCount,
      warningCount,
      overallStatus,
      generatedAt,
    };
  }

  private async findMissingPayoutProfiles(): Promise<FinanceHealthIssueDto[]> {
    const { data: buildersWithEarnings, error: earningsError } = await this.client
      .from(PRODUCTION_TABLES.invoices)
      .select('builder_id')
      .in('status', ['processing', 'paid']);

    if (earningsError) throw earningsError;

    const builderIds = [...new Set((buildersWithEarnings ?? []).map((r) => r.builder_id))];
    if (builderIds.length === 0) return [];

    const { data: methods, error: methodsError } = await this.client
      .from(PRODUCTION_TABLES.builderPayoutMethods)
      .select('builder_id')
      .in('builder_id', builderIds)
      .eq('status', 'active');

    if (methodsError) throw methodsError;

    const withProfile = new Set((methods ?? []).map((r) => r.builder_id));
    const missing = builderIds.filter((id) => !withProfile.has(id));

    return missing.map((builderId) => ({
      id: `missing_payout_profile:${builderId}`,
      type: 'missing_payout_profile' as const,
      severity: 'warning' as const,
      title: 'Missing payout profile',
      message: `Builder ${builderId} has earnings but no active payout method.`,
      entityType: 'builder',
      entityId: builderId,
      amountUsd: null,
      detectedAt: nowIso(),
    }));
  }

  private async findAgedEscrows(days: number): Promise<FinanceHealthIssueDto[]> {
    const cutoff = daysAgoIso(days);

    const { data, error } = await this.client
      .from(PRODUCTION_TABLES.collabs)
      .select('id, title, escrow_amount_usd, updated_at, status')
      .gt('escrow_amount_usd', 0)
      .lt('updated_at', cutoff)
      .not('status', 'in', '("completed","cancelled","closed")')
      .limit(50);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: `escrow_aged:${row.id}`,
      type: 'escrow_aged' as const,
      severity: 'warning' as const,
      title: 'Escrow held too long',
      message: `Collab "${row.title}" has escrow older than ${days} days.`,
      entityType: 'collab',
      entityId: row.id,
      amountUsd: Number(row.escrow_amount_usd ?? 0),
      detectedAt: nowIso(),
    }));
  }

  private async findStaleRefunds(days: number): Promise<FinanceHealthIssueDto[]> {
    const cutoff = daysAgoIso(days);

    const { data, error } = await this.client
      .from(PRODUCTION_TABLES.refundRequests)
      .select('id, requested_amount_usd, status, created_at')
      .in('status', [...ACTIVE_REFUND_STATUSES])
      .lt('created_at', cutoff)
      .limit(50);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: `refund_pending_too_long:${row.id}`,
      type: 'refund_pending_too_long' as const,
      severity: 'critical' as const,
      title: 'Refund pending too long',
      message: `Refund ${row.id} has been in status "${row.status}" for over ${days} days.`,
      entityType: 'refund_request',
      entityId: row.id,
      amountUsd: Number(row.requested_amount_usd ?? 0),
      detectedAt: nowIso(),
    }));
  }

  private async findFailedPayouts(): Promise<FinanceHealthIssueDto[]> {
    const [financeFailed, withdrawalFailed] = await Promise.all([
      this.client
        .from(FINANCE_TABLES.payouts)
        .select('id, builder_id, net_amount, created_at')
        .eq('status', PayoutStatus.Failed)
        .limit(50),
      this.client
        .from(PRODUCTION_TABLES.builderWithdrawals)
        .select('id, builder_id, amount_usd, created_at, failure_reason')
        .eq('status', 'failed')
        .limit(50),
    ]);

    if (financeFailed.error) throw financeFailed.error;
    if (withdrawalFailed.error) throw withdrawalFailed.error;

    const financeIssues = (financeFailed.data ?? []).map((row) => ({
      id: `failed_payout:finance:${row.id}`,
      type: 'failed_payout' as const,
      severity: 'critical' as const,
      title: 'Failed finance payout',
      message: `Finance payout ${row.id} failed for builder ${row.builder_id}.`,
      entityType: 'finance_payout',
      entityId: row.id,
      amountUsd: Number(row.net_amount ?? 0),
      detectedAt: nowIso(),
    }));

    const withdrawalIssues = (withdrawalFailed.data ?? []).map((row) => ({
      id: `failed_payout:withdrawal:${row.id}`,
      type: 'failed_payout' as const,
      severity: 'critical' as const,
      title: 'Failed builder withdrawal',
      message: `Withdrawal ${row.id} failed${row.failure_reason ? `: ${row.failure_reason}` : '.'}`,
      entityType: 'builder_withdrawal',
      entityId: row.id,
      amountUsd: Number(row.amount_usd ?? 0),
      detectedAt: nowIso(),
    }));

    return [...financeIssues, ...withdrawalIssues];
  }

  private async findMissingInvoices(): Promise<FinanceHealthIssueDto[]> {
    const { data: openDisputes, error: disputeError } = await this.client
      .from(PRODUCTION_TABLES.disputes)
      .select('collab_id')
      .in('status', [...OPEN_DISPUTE_STATUSES]);

    if (disputeError) throw disputeError;

    const collabIds = [...new Set((openDisputes ?? []).map((d) => d.collab_id))];
    if (collabIds.length === 0) return [];

    const { data: invoices, error: invoiceError } = await this.client
      .from(PRODUCTION_TABLES.invoices)
      .select('collab_id')
      .in('collab_id', collabIds);

    if (invoiceError) throw invoiceError;

    const collabsWithInvoice = new Set((invoices ?? []).map((i) => i.collab_id));
    const missing = collabIds.filter((id) => !collabsWithInvoice.has(id));

    return missing.map((collabId) => ({
      id: `missing_invoice:${collabId}`,
      type: 'missing_invoice' as const,
      severity: 'warning' as const,
      title: 'Missing invoice for active dispute collab',
      message: `Collab ${collabId} has an open dispute but no invoice record.`,
      entityType: 'collab',
      entityId: collabId,
      amountUsd: null,
      detectedAt: nowIso(),
    }));
  }

  private async findDuplicateIdempotencyKeys(): Promise<FinanceHealthIssueDto[]> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('idempotency_key')
      .limit(5000);

    if (error) throw error;

    const seen = new Map<string, number>();
    for (const row of data ?? []) {
      const key = row.idempotency_key as string;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }

    return [...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([key, count]) => ({
        id: `duplicate_idempotency_key:${key}`,
        type: 'duplicate_idempotency_key' as const,
        severity: 'critical' as const,
        title: 'Duplicate ledger idempotency key',
        message: `Idempotency key "${key}" appears ${count} times in finance_ledger_entries.`,
        entityType: 'ledger_entry',
        entityId: key,
        amountUsd: null,
        detectedAt: nowIso(),
      }));
  }

  private async findReconciliationMismatches(): Promise<FinanceHealthIssueDto[]> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.reconciliationItems)
      .select('id, run_id, transaction_id, difference, status')
      .neq('difference', 0)
      .in('status', [ReconciliationStatus.Pending, ReconciliationStatus.Failed])
      .limit(50);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: `reconciliation_mismatch:${row.id}`,
      type: 'reconciliation_mismatch' as const,
      severity: 'critical' as const,
      title: 'Reconciliation mismatch',
      message: `Reconciliation item ${row.id} has difference of ${row.difference}.`,
      entityType: 'reconciliation_item',
      entityId: row.id,
      amountUsd: Math.abs(Number(row.difference ?? 0)),
      detectedAt: nowIso(),
    }));
  }

  private async findMissingPayoutReferences(): Promise<FinanceHealthIssueDto[]> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.payouts)
      .select('id, builder_id, net_amount, status, reference')
      .eq('status', PayoutStatus.Completed)
      .is('reference', null)
      .limit(50);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: `missing_payout_reference:${row.id}`,
      type: 'missing_payout_reference' as const,
      severity: 'warning' as const,
      title: 'Missing payout reference',
      message: `Completed payout ${row.id} has no provider reference.`,
      entityType: 'finance_payout',
      entityId: row.id,
      amountUsd: Number(row.net_amount ?? 0),
      detectedAt: nowIso(),
    }));
  }
}

function severityRank(severity: FinanceHealthIssueDto['severity']): number {
  switch (severity) {
    case 'critical':
      return 3;
    case 'warning':
      return 2;
    case 'info':
      return 1;
    default:
      return 0;
  }
}
