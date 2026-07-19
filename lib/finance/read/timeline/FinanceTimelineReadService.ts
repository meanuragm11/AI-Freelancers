/**
 * FinanceTimelineReadService
 *
 * Purpose: Unified chronological feed of finance activity across events, ledger, payouts,
 *   refunds, disputes, and withdrawals.
 * Responsibilities: Fetch batched rows from each source in parallel, normalize to TimelineItemDto,
 *   merge/sort/filter in memory, paginate. Avoid N+1 by batch queries only.
 * Future integration: GET /api/finance/timeline, /founder/finance/activity feed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FinanceEventRepository,
  LedgerRepository,
  PayoutRepository,
} from '../../repositories';
import type { TimelineFilters } from '../shared/filters';
import type { PaginatedResult, PaginationParams } from '../shared/pagination';
import {
  buildPaginationMeta,
  paginationOffset,
  parsePaginationParams,
} from '../shared/pagination';
import { PRODUCTION_TABLES } from '../shared/productionTables';
import type { TimelineItemDto } from '../shared/dto/timeline';
import {
  applyDateRange,
  createTimelineItemFromDispute,
  createTimelineItemFromPayout,
  createTimelineItemFromRefund,
  createTimelineItemFromWithdrawal,
  mapFinanceEventToTimelineItem,
  mapLedgerToTimelineItem,
  matchesTimelineFilters,
  sortTimelineItems,
} from '../shared/mappers';

const TIMELINE_FETCH_MULTIPLIER = 3;
const MAX_TIMELINE_FETCH = 500;

export class FinanceTimelineReadService {
  private readonly eventRepo: FinanceEventRepository;
  private readonly ledgerRepo: LedgerRepository;
  private readonly payoutRepo: PayoutRepository;

  constructor(private readonly client: SupabaseClient) {
    this.eventRepo = new FinanceEventRepository(client);
    this.ledgerRepo = new LedgerRepository(client);
    this.payoutRepo = new PayoutRepository(client);
  }

  async listTimeline(
    filters: TimelineFilters = {},
    paginationInput: Partial<PaginationParams> = {}
  ): Promise<PaginatedResult<TimelineItemDto>> {
    const pagination = parsePaginationParams(paginationInput, {
      defaultSort: 'occurredAt',
      defaultDirection: 'desc',
    });

    const fetchLimit = Math.min(
      pagination.page * pagination.pageSize * TIMELINE_FETCH_MULTIPLIER,
      MAX_TIMELINE_FETCH
    );

    const includeEntity = (entity: string) => !filters.entity || filters.entity === entity;

    const [
      events,
      ledgerEntries,
      payouts,
      refunds,
      disputes,
      withdrawals,
    ] = await Promise.all([
      includeEntity('event')
        ? this.eventRepo.list({
            event_type: filters.eventType as never,
            collab_id: filters.collabId,
            transaction_id: undefined,
            buyer_id: filters.buyerId,
            builder_id: filters.builderId,
            limit: fetchLimit,
            offset: 0,
          })
        : Promise.resolve([]),
      includeEntity('ledger')
        ? this.ledgerRepo.list({
            buyer_id: filters.buyerId,
            builder_id: filters.builderId,
            collab_id: filters.collabId,
            entry_type: filters.eventType as never,
            limit: fetchLimit,
            offset: 0,
          })
        : Promise.resolve([]),
      includeEntity('payout')
        ? this.payoutRepo.list({ limit: fetchLimit, offset: 0 })
        : Promise.resolve([]),
      includeEntity('refund') ? this.fetchRefunds(filters, fetchLimit) : Promise.resolve([]),
      includeEntity('dispute') ? this.fetchDisputes(filters, fetchLimit) : Promise.resolve([]),
      includeEntity('withdrawal')
        ? this.fetchWithdrawals(filters, fetchLimit)
        : Promise.resolve([]),
    ]);

    let items: TimelineItemDto[] = [
      ...events.map(mapFinanceEventToTimelineItem),
      ...ledgerEntries.map(mapLedgerToTimelineItem),
      ...payouts.map((row) => createTimelineItemFromPayout(row)),
      ...refunds.map(createTimelineItemFromRefund),
      ...disputes.map(createTimelineItemFromDispute),
      ...withdrawals.map(createTimelineItemFromWithdrawal),
    ];

    if (filters.invoiceId) {
      items = items.filter((item) => item.invoiceId === filters.invoiceId);
    }
    if (filters.transactionId) {
      items = items.filter((item) => item.transactionId === filters.transactionId);
    }

    items = items.filter((item) => matchesTimelineFilters(item, filters));
    items = sortTimelineItems(items, pagination.sort, pagination.direction);

    const total = items.length;
    const offset = paginationOffset(pagination);
    const pageItems = items.slice(offset, offset + pagination.pageSize);

    return {
      items: pageItems,
      meta: buildPaginationMeta(total, pagination),
    };
  }

  private async fetchRefunds(
    filters: TimelineFilters,
    limit: number
  ): Promise<
    Array<{
      id: string;
      buyer_id: string;
      builder_id: string;
      collab_id: string;
      transaction_id: string;
      requested_amount_usd: number;
      status: string;
      reason: string;
      created_at: string;
    }>
  > {
    let query = this.client
      .from(PRODUCTION_TABLES.refundRequests)
      .select(
        'id, buyer_id, builder_id, collab_id, transaction_id, requested_amount_usd, status, reason, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters.buyerId) query = query.eq('buyer_id', filters.buyerId);
    if (filters.builderId) query = query.eq('builder_id', filters.builderId);
    if (filters.collabId) query = query.eq('collab_id', filters.collabId);
    if (filters.status) query = query.eq('status', filters.status);
    query = applyDateRange(query, 'created_at', filters.from, filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  private async fetchDisputes(
    filters: TimelineFilters,
    limit: number
  ): Promise<
    Array<{
      id: string;
      buyer_id: string;
      freelancer_id: string;
      collab_id: string;
      status: string;
      primary_reason: string;
      created_at: string;
    }>
  > {
    let query = this.client
      .from(PRODUCTION_TABLES.disputes)
      .select('id, buyer_id, freelancer_id, collab_id, status, primary_reason, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters.buyerId) query = query.eq('buyer_id', filters.buyerId);
    if (filters.builderId) query = query.eq('freelancer_id', filters.builderId);
    if (filters.collabId) query = query.eq('collab_id', filters.collabId);
    if (filters.status) query = query.eq('status', filters.status);
    query = applyDateRange(query, 'created_at', filters.from, filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  private async fetchWithdrawals(
    filters: TimelineFilters,
    limit: number
  ): Promise<
    Array<{
      id: string;
      builder_id: string;
      amount_usd: number;
      status: string;
      reference_code: string;
      created_at: string;
    }>
  > {
    let query = this.client
      .from(PRODUCTION_TABLES.builderWithdrawals)
      .select('id, builder_id, amount_usd, status, reference_code, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters.builderId) query = query.eq('builder_id', filters.builderId);
    if (filters.status) query = query.eq('status', filters.status);
    query = applyDateRange(query, 'created_at', filters.from, filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
