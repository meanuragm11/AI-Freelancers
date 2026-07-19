/**
 * PayoutQueueReadService
 *
 * Purpose: Unified payout queue for founder action — finance_payouts plus production
 *   builder_withdrawals and processing invoices.
 * Responsibilities: Batch-fetch all sources, dedupe by id, map to PayoutQueueItemDto, paginate.
 * Future integration: GET /api/finance/payouts, /founder/finance/payout queue.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { PayoutRepository } from '../../repositories';
import type { PayoutStatus } from '../../enums';
import type { PayoutQueueFilters } from '../shared/filters';
import type { PayoutQueueItemDto } from '../shared/dto/payouts';
import type { PaginatedResult, PaginationParams } from '../shared/pagination';
import {
  buildPaginationMeta,
  paginationOffset,
  parsePaginationParams,
} from '../shared/pagination';
import { PRODUCTION_TABLES } from '../shared/productionTables';
import {
  applyDateRange,
  mapFinancePayoutToDto,
  mapInvoiceToPayoutDto,
  mapWithdrawalToPayoutDto,
  payoutSourcePriority,
} from '../shared/mappers';

export class PayoutQueueReadService {
  private readonly payoutRepo: PayoutRepository;

  constructor(private readonly client: SupabaseClient) {
    this.payoutRepo = new PayoutRepository(client);
  }

  async listPayoutQueue(
    filters: PayoutQueueFilters = {},
    paginationInput: Partial<PaginationParams> = {}
  ): Promise<PaginatedResult<PayoutQueueItemDto>> {
    const pagination = parsePaginationParams(paginationInput, {
      defaultSort: 'created_at',
      defaultDirection: 'desc',
    });

    const fetchLimit = Math.min(pagination.page * pagination.pageSize * 2, 500);

    const [financePayouts, withdrawals, invoices, builderNames] = await Promise.all([
      this.payoutRepo.list({
        builder_id: filters.builderId,
        status: filters.status as PayoutStatus | undefined,
        limit: fetchLimit,
        offset: 0,
      }),
      this.fetchWithdrawals(filters, fetchLimit),
      this.fetchInvoices(filters, fetchLimit),
      this.fetchBuilderNames(filters.builderId),
    ]);

    const nameByBuilderId = builderNames;

    let items: PayoutQueueItemDto[] = [
      ...financePayouts.map((row) =>
        mapFinancePayoutToDto(row, nameByBuilderId.get(row.builder_id) ?? null)
      ),
      ...withdrawals.map(mapWithdrawalToPayoutDto),
      ...invoices.map(mapInvoiceToPayoutDto),
    ];

    if (filters.requiresFounderAction) {
      items = items.filter((item) => item.requiresFounderAction);
    }

    items.sort((a, b) => {
      const priorityDiff = payoutSourcePriority(a.source) - payoutSourcePriority(b.source);
      if (priorityDiff !== 0) return priorityDiff;
      const aTime = a.createdAt;
      const bTime = b.createdAt;
      return pagination.direction === 'asc'
        ? aTime.localeCompare(bTime)
        : bTime.localeCompare(aTime);
    });

    const total = items.length;
    const offset = paginationOffset(pagination);
    const pageItems = items.slice(offset, offset + pagination.pageSize);

    return {
      items: pageItems,
      meta: buildPaginationMeta(total, pagination),
    };
  }

  private async fetchWithdrawals(filters: PayoutQueueFilters, limit: number) {
    let query = this.client
      .from(PRODUCTION_TABLES.builderWithdrawals)
      .select(
        'id, builder_id, amount_usd, status, reference_code, created_at, completed_at, builder:builder_id(full_name)'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters.builderId) query = query.eq('builder_id', filters.builderId);
    if (filters.status) query = query.eq('status', filters.status);
    query = applyDateRange(query, 'created_at', filters.from, filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  private async fetchInvoices(filters: PayoutQueueFilters, limit: number) {
    let query = this.client
      .from(PRODUCTION_TABLES.invoices)
      .select(
        'id, builder_id, gross_amount_usd, net_payout_usd, status, created_at, builder:builder_id(full_name)'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters.builderId) query = query.eq('builder_id', filters.builderId);
    if (filters.status) query = query.eq('status', filters.status);
    query = applyDateRange(query, 'created_at', filters.from, filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  private async fetchBuilderNames(
    builderId?: string
  ): Promise<Map<string, string | null>> {
    let query = this.client.from(PRODUCTION_TABLES.profiles).select('id, full_name');
    if (builderId) query = query.eq('id', builderId);

    const { data, error } = await query.limit(500);
    if (error) throw error;

    return new Map((data ?? []).map((row) => [row.id, row.full_name as string | null]));
  }
}
