/**
 * DisputeQueueReadService
 *
 * Purpose: Paginated dispute action queue from production disputes table.
 * Responsibilities: Map production statuses to founder queue filters, batch collab escrow
 *   amounts, return DisputeQueueItemDto only.
 * Future integration: GET /api/finance/disputes, /founder/finance/dispute queue.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DisputeQueueFilters } from '../shared/filters';
import type { DisputeQueueItemDto } from '../shared/dto/disputes';
import type { PaginatedResult, PaginationParams } from '../shared/pagination';
import {
  buildPaginationMeta,
  paginationOffset,
  parsePaginationParams,
} from '../shared/pagination';
import { PRODUCTION_TABLES } from '../shared/productionTables';
import {
  applyDateRange,
  mapDisputeQueueFilterToDbStatuses,
  mapDisputeToDto,
} from '../shared/mappers';

export class DisputeQueueReadService {
  constructor(private readonly client: SupabaseClient) {}

  async listDisputeQueue(
    filters: DisputeQueueFilters = {},
    paginationInput: Partial<PaginationParams> = {}
  ): Promise<PaginatedResult<DisputeQueueItemDto>> {
    const pagination = parsePaginationParams(paginationInput, {
      defaultSort: 'created_at',
      defaultDirection: 'desc',
    });
    const offset = paginationOffset(pagination);

    const [count, rows] = await Promise.all([
      this.countDisputes(filters),
      this.fetchDisputes(filters, pagination, offset),
    ]);

    const collabIds = [...new Set(rows.map((row) => row.collab_id))];
    const escrowByCollab = await this.fetchCollabEscrowAmounts(collabIds);

    return {
      items: rows.map((row) =>
        mapDisputeToDto(row, escrowByCollab.get(row.collab_id) ?? null)
      ),
      meta: buildPaginationMeta(count, pagination),
    };
  }

  private async countDisputes(filters: DisputeQueueFilters): Promise<number> {
    let query = this.client
      .from(PRODUCTION_TABLES.disputes)
      .select('*', { count: 'exact', head: true });

    query = this.applyFilters(query, filters);

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  private async fetchDisputes(
    filters: DisputeQueueFilters,
    pagination: PaginationParams,
    offset: number
  ) {
    let query = this.client
      .from(PRODUCTION_TABLES.disputes)
      .select(
        'id, collab_id, buyer_id, freelancer_id, status, primary_reason, escrow_frozen_at, created_at, resolved_at, escrow_snapshot'
      )
      .order(pagination.sort, { ascending: pagination.direction === 'asc' })
      .range(offset, offset + pagination.pageSize - 1);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  private async fetchCollabEscrowAmounts(collabIds: string[]): Promise<Map<string, number>> {
    if (collabIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from(PRODUCTION_TABLES.collabs)
      .select('id, escrow_amount_usd')
      .in('id', collabIds);

    if (error) throw error;

    return new Map(
      (data ?? []).map((row) => [row.id, Number(row.escrow_amount_usd ?? 0)])
    );
  }

  private applyFilters<T extends { eq: (col: string, val: string) => T; in: (col: string, vals: string[]) => T; gte: (col: string, val: string) => T; lte: (col: string, val: string) => T }>(
    query: T,
    filters: DisputeQueueFilters
  ): T {
    let next = query;
    if (filters.buyerId) next = next.eq('buyer_id', filters.buyerId);
    if (filters.builderId) next = next.eq('freelancer_id', filters.builderId);
    if (filters.collabId) next = next.eq('collab_id', filters.collabId);
    if (filters.status) {
      const statuses = mapDisputeQueueFilterToDbStatuses(filters.status);
      if (statuses.length > 0) next = next.in('status', statuses);
    }
    next = applyDateRange(next, 'created_at', filters.from, filters.to);
    return next;
  }
}
