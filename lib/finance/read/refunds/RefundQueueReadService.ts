/**
 * RefundQueueReadService
 *
 * Purpose: Paginated refund action queue from production refund_requests, enriched by
 *   finance_events when available.
 * Responsibilities: Status filter mapping, batch fetch, DTO mapping, pagination.
 * Future integration: GET /api/finance/refunds, /founder/finance/refund queue.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_TABLES } from '../../constants';
import type { RefundQueueFilters } from '../shared/filters';
import type { RefundQueueItemDto } from '../shared/dto/refunds';
import type { PaginatedResult, PaginationParams } from '../shared/pagination';
import {
  buildPaginationMeta,
  paginationOffset,
  parsePaginationParams,
} from '../shared/pagination';
import { PRODUCTION_TABLES } from '../shared/productionTables';
import {
  applyDateRange,
  mapRefundQueueFilterToDbStatuses,
  mapRefundRequestToDto,
} from '../shared/mappers';

export class RefundQueueReadService {
  constructor(private readonly client: SupabaseClient) {}

  async listRefundQueue(
    filters: RefundQueueFilters = {},
    paginationInput: Partial<PaginationParams> = {}
  ): Promise<PaginatedResult<RefundQueueItemDto>> {
    const pagination = parsePaginationParams(paginationInput, {
      defaultSort: 'created_at',
      defaultDirection: 'desc',
    });
    const offset = paginationOffset(pagination);

    const [count, rows] = await Promise.all([
      this.countRefunds(filters),
      this.fetchRefunds(filters, pagination, offset),
    ]);

    return {
      items: rows.map(mapRefundRequestToDto),
      meta: buildPaginationMeta(count, pagination),
    };
  }

  /** Batch lookup of finance event timestamps for listed refund IDs (no N+1). */
  async enrichWithFinanceEvents(refundIds: string[]): Promise<Map<string, string>> {
    if (refundIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from(FINANCE_TABLES.events)
      .select('refund_request_id, created_at')
      .in('refund_request_id', refundIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const map = new Map<string, string>();
    for (const row of data ?? []) {
      if (row.refund_request_id && !map.has(row.refund_request_id)) {
        map.set(row.refund_request_id, row.created_at);
      }
    }
    return map;
  }

  private async countRefunds(filters: RefundQueueFilters): Promise<number> {
    let query = this.client
      .from(PRODUCTION_TABLES.refundRequests)
      .select('*', { count: 'exact', head: true });

    query = this.applyFilters(query, filters);

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  private async fetchRefunds(
    filters: RefundQueueFilters,
    pagination: PaginationParams,
    offset: number
  ) {
    let query = this.client
      .from(PRODUCTION_TABLES.refundRequests)
      .select(
        'id, buyer_id, builder_id, collab_id, transaction_id, requested_amount_usd, status, refund_type, reason, founder_decision_amount_usd, created_at, updated_at'
      )
      .order(pagination.sort, { ascending: pagination.direction === 'asc' })
      .range(offset, offset + pagination.pageSize - 1);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  private applyFilters<T extends { eq: (col: string, val: string) => T; in: (col: string, vals: string[]) => T; gte: (col: string, val: string) => T; lte: (col: string, val: string) => T }>(
    query: T,
    filters: RefundQueueFilters
  ): T {
    let next = query;
    if (filters.buyerId) next = next.eq('buyer_id', filters.buyerId);
    if (filters.builderId) next = next.eq('builder_id', filters.builderId);
    if (filters.collabId) next = next.eq('collab_id', filters.collabId);
    if (filters.status) {
      const statuses = mapRefundQueueFilterToDbStatuses(filters.status);
      if (statuses.length > 0) next = next.in('status', statuses);
    }
    next = applyDateRange(next, 'created_at', filters.from, filters.to);
    return next;
  }
}
