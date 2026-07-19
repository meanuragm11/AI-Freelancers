/**
 * FinanceOverviewReadService
 *
 * Purpose: Aggregate high-level finance KPIs for the founder Finance Command Center header.
 * Responsibilities: Sum escrow, revenue, pending queues, and payables from finance V2 tables;
 *   fall back to production shadow tables (transactions, collabs, refund_requests, disputes,
 *   invoices, builder_withdrawals) when finance tables are empty.
 * Future integration: GET /api/finance/overview, /founder/finance dashboard hero metrics.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_TABLES } from '../../constants';
import { FinanceAccountType, PayoutStatus } from '../../enums';
import { startOfUtcDay, nowIso } from '../../utils/dates';
import { roundMoney } from '../../utils/money';
import type { FinanceOverviewDto } from '../shared/dto/overview';
import {
  ACTIVE_REFUND_STATUSES,
  OPEN_DISPUTE_STATUSES,
  PENDING_INVOICE_STATUSES,
  PENDING_WITHDRAWAL_STATUSES,
  PRODUCTION_TABLES,
} from '../shared/productionTables';
import { sumColumn } from '../shared/mappers';

export class FinanceOverviewReadService {
  constructor(private readonly client: SupabaseClient) {}

  async getOverview(): Promise<FinanceOverviewDto> {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const todayStart = startOfUtcDay();

    const [
      ledgerCount,
      financePayoutsPending,
      financeEscrowRows,
      financeRevenueRows,
      financeTodayRows,
      financeMonthRows,
      productionEscrow,
      productionRevenue,
      productionTodayRevenue,
      productionMonthRevenue,
      productionPendingPayouts,
      productionPendingRefunds,
      productionPendingDisputes,
      productionBuilderPayables,
    ] = await Promise.all([
      this.countTable(FINANCE_TABLES.ledgerEntries),
      this.sumFinancePayouts([PayoutStatus.Pending, PayoutStatus.Processing]),
      this.sumLedgerByAccount(FinanceAccountType.EscrowHold),
      this.sumLedgerPlatformFees(),
      this.sumLedgerPlatformFees(todayStart),
      this.sumLedgerPlatformFees(monthStart.toISOString()),
      this.sumProductionEscrow(),
      this.sumProductionPlatformRevenue(),
      this.sumProductionPlatformRevenue(todayStart),
      this.sumProductionPlatformRevenue(monthStart.toISOString()),
      this.sumProductionPendingPayouts(),
      this.sumProductionPendingRefunds(),
      this.countProductionPendingDisputes(),
      this.sumProductionBuilderPayables(),
    ]);

    const useFinanceV2 = ledgerCount > 0;
    let dataSource: FinanceOverviewDto['dataSource'] = useFinanceV2
      ? 'finance_v2'
      : 'production_shadow';

    const escrowBalanceUsd = useFinanceV2 ? financeEscrowRows : productionEscrow;
    const platformRevenueUsd = useFinanceV2 ? financeRevenueRows : productionRevenue;
    const todayRevenueUsd = useFinanceV2 ? financeTodayRows : productionTodayRevenue;
    const monthlyRevenueUsd = useFinanceV2 ? financeMonthRows : productionMonthRevenue;

    let pendingPayoutsUsd = useFinanceV2 ? financePayoutsPending : productionPendingPayouts;
    let pendingRefundsUsd = productionPendingRefunds;
    let pendingDisputesCount = productionPendingDisputes;
    let builderPayablesUsd = productionBuilderPayables;

    if (useFinanceV2 && financePayoutsPending === 0) {
      pendingPayoutsUsd = productionPendingPayouts;
      if (productionPendingPayouts > 0) dataSource = 'mixed';
    }

    if (useFinanceV2) {
      const [financeRefunds, financeDisputes] = await Promise.all([
        this.sumFinanceRefundEvents(),
        this.countFinanceDisputeEvents(),
      ]);
      if (financeRefunds > 0) pendingRefundsUsd = financeRefunds;
      if (financeDisputes > 0) pendingDisputesCount = financeDisputes;
      if (financeRefunds > 0 || financeDisputes > 0) dataSource = 'mixed';
    }

    return {
      escrowBalanceUsd: roundMoney(escrowBalanceUsd),
      platformRevenueUsd: roundMoney(platformRevenueUsd),
      pendingPayoutsUsd: roundMoney(pendingPayoutsUsd),
      pendingRefundsUsd: roundMoney(pendingRefundsUsd),
      pendingDisputesCount,
      builderPayablesUsd: roundMoney(builderPayablesUsd),
      todayRevenueUsd: roundMoney(todayRevenueUsd),
      monthlyRevenueUsd: roundMoney(monthlyRevenueUsd),
      dataSource,
      generatedAt: nowIso(),
    };
  }

  private async countTable(table: string): Promise<number> {
    const { count, error } = await this.client
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  }

  private async sumFinancePayouts(statuses: PayoutStatus[]): Promise<number> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.payouts)
      .select('net_amount')
      .in('status', statuses);
    if (error) throw error;
    return sumColumn((data ?? []) as Array<Record<string, unknown>>, 'net_amount');
  }

  private async sumLedgerByAccount(accountType: FinanceAccountType): Promise<number> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('net_amount_usd, direction')
      .eq('account_type', accountType);
    if (error) throw error;

    return roundMoney(
      (data ?? []).reduce((sum, row) => {
        const amount = Number(row.net_amount_usd ?? 0);
        const signed = row.direction === 'credit' ? amount : -amount;
        return sum + signed;
      }, 0)
    );
  }

  private async sumLedgerPlatformFees(from?: string): Promise<number> {
    let query = this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('platform_fee_usd')
      .gt('platform_fee_usd', 0);

    if (from) query = query.gte('created_at', from);

    const { data, error } = await query;
    if (error) throw error;
    return sumColumn((data ?? []) as Array<Record<string, unknown>>, 'platform_fee_usd');
  }

  private async sumFinanceRefundEvents(): Promise<number> {
    const { data, error } = await this.client
      .from(FINANCE_TABLES.events)
      .select('metadata')
      .in('event_type', ['refund_requested', 'refund_completed']);
    if (error) throw error;

    return roundMoney(
      (data ?? []).reduce((sum, row) => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const amount = Number(meta.amount_usd ?? meta.requested_amount_usd ?? 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0)
    );
  }

  private async countFinanceDisputeEvents(): Promise<number> {
    const { count, error } = await this.client
      .from(FINANCE_TABLES.events)
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'dispute_opened');
    if (error) throw error;
    return count ?? 0;
  }

  private async sumProductionEscrow(): Promise<number> {
    const { data, error } = await this.client
      .from(PRODUCTION_TABLES.collabs)
      .select('escrow_amount_usd, status')
      .gt('escrow_amount_usd', 0)
      .not('status', 'in', '("completed","cancelled","closed")');
    if (error) throw error;
    return sumColumn((data ?? []) as Array<Record<string, unknown>>, 'escrow_amount_usd');
  }

  private async sumProductionPlatformRevenue(from?: string): Promise<number> {
    let query = this.client
      .from(PRODUCTION_TABLES.transactions)
      .select('fee_usd')
      .eq('status', 'completed');

    if (from) query = query.gte('created_at', from);

    const { data, error } = await query;
    if (error) throw error;
    return sumColumn((data ?? []) as Array<Record<string, unknown>>, 'fee_usd');
  }

  private async sumProductionPendingPayouts(): Promise<number> {
    const [withdrawalsRes, invoicesRes, financePayoutsRes] = await Promise.all([
      this.client
        .from(PRODUCTION_TABLES.builderWithdrawals)
        .select('amount_usd')
        .in('status', [...PENDING_WITHDRAWAL_STATUSES]),
      this.client
        .from(PRODUCTION_TABLES.invoices)
        .select('net_payout_usd')
        .in('status', [...PENDING_INVOICE_STATUSES]),
      this.client
        .from(FINANCE_TABLES.payouts)
        .select('net_amount')
        .in('status', [PayoutStatus.Pending, PayoutStatus.Processing]),
    ]);

    if (withdrawalsRes.error) throw withdrawalsRes.error;
    if (invoicesRes.error) throw invoicesRes.error;
    if (financePayoutsRes.error) throw financePayoutsRes.error;

    return roundMoney(
      sumColumn((withdrawalsRes.data ?? []) as Array<Record<string, unknown>>, 'amount_usd') +
        sumColumn((invoicesRes.data ?? []) as Array<Record<string, unknown>>, 'net_payout_usd') +
        sumColumn((financePayoutsRes.data ?? []) as Array<Record<string, unknown>>, 'net_amount')
    );
  }

  private async sumProductionPendingRefunds(): Promise<number> {
    const { data, error } = await this.client
      .from(PRODUCTION_TABLES.refundRequests)
      .select('requested_amount_usd')
      .in('status', [...ACTIVE_REFUND_STATUSES]);
    if (error) throw error;
    return sumColumn(
      (data ?? []) as Array<Record<string, unknown>>,
      'requested_amount_usd'
    );
  }

  private async countProductionPendingDisputes(): Promise<number> {
    const { count, error } = await this.client
      .from(PRODUCTION_TABLES.disputes)
      .select('*', { count: 'exact', head: true })
      .in('status', [...OPEN_DISPUTE_STATUSES]);
    if (error) throw error;
    return count ?? 0;
  }

  private async sumProductionBuilderPayables(): Promise<number> {
    const { data, error } = await this.client
      .from(PRODUCTION_TABLES.invoices)
      .select('net_payout_usd')
      .eq('status', 'processing');
    if (error) throw error;
    return sumColumn((data ?? []) as Array<Record<string, unknown>>, 'net_payout_usd');
  }
}
