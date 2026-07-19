import type { SupabaseClient } from '@supabase/supabase-js';
import { DisputeQueueReadService, RefundQueueReadService } from '@/lib/finance/read';
import type { DisputeQueueStatusFilter } from '@/lib/finance/read/shared/dto/disputes';
import type { RefundQueueStatusFilter } from '@/lib/finance/read/shared/dto/refunds';
import type { DisputeQueueItemDto } from '@/lib/finance/read/shared/dto/disputes';
import type { RefundQueueItemDto } from '@/lib/finance/read/shared/dto/refunds';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '@/lib/finance/read/shared/pagination';
import { filterBySearch } from './search';
import {
  CONSOLE_PRIORITY_RANK,
  type ConsolePriority,
  type FinanceCaseItem,
  type FinanceCasesResponse,
} from './types';

export type CasesTypeFilter = 'all' | 'refunds' | 'disputes';

export interface CasesQueryParams {
  type?: CasesTypeFilter;
  status?: string;
  priority?: ConsolePriority;
  page?: string;
  pageSize?: string;
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  from?: string;
  to?: string;
}

const CASE_FETCH_LIMIT = 500;

function refundStatusToPriority(status: RefundQueueItemDto['queueStatus']): ConsolePriority {
  switch (status) {
    case 'waiting_founder':
      return 'CRITICAL';
    case 'pending':
    case 'waiting_builder':
      return 'MEDIUM';
    case 'approved':
      return 'LOW';
    default:
      return 'LOW';
  }
}

function disputeStatusToPriority(status: DisputeQueueItemDto['queueStatus']): ConsolePriority {
  switch (status) {
    case 'waiting_founder':
      return 'HIGH';
    case 'settlement_pending':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

function mapRefundToCase(
  item: RefundQueueItemDto,
  names: Map<string, string | null>,
  collabTitles: Map<string, string | null>
): FinanceCaseItem {
  return {
    id: item.id,
    type: 'refund',
    buyer: { id: item.buyerId, name: names.get(item.buyerId) ?? null },
    builder: { id: item.builderId, name: names.get(item.builderId) ?? null },
    project: { id: item.collabId, title: collabTitles.get(item.collabId) ?? null },
    amount: item.requestedAmountUsd,
    status: item.queueStatus,
    openedAt: item.createdAt,
    priority: refundStatusToPriority(item.queueStatus),
    assignedTo: null,
    actionUrl: `/founder/refunds?q=${item.id}`,
  };
}

function mapDisputeToCase(
  item: DisputeQueueItemDto,
  names: Map<string, string | null>,
  collabTitles: Map<string, string | null>
): FinanceCaseItem {
  return {
    id: item.id,
    type: 'dispute',
    buyer: { id: item.buyerId, name: names.get(item.buyerId) ?? null },
    builder: { id: item.builderId, name: names.get(item.builderId) ?? null },
    project: { id: item.collabId, title: collabTitles.get(item.collabId) ?? null },
    amount: item.amountAtStakeUsd ?? 0,
    status: item.queueStatus,
    openedAt: item.openedAt,
    priority: disputeStatusToPriority(item.queueStatus),
    assignedTo: null,
    actionUrl: `/founder/disputes/${item.id}`,
  };
}

async function fetchProfileNames(
  client: SupabaseClient,
  ids: string[]
): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row.full_name as string | null]));
}

async function fetchCollabTitles(
  client: SupabaseClient,
  ids: string[]
): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await client
    .from('collabs')
    .select('id, title')
    .in('id', ids);

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row.title as string | null]));
}

function sortCases(items: FinanceCaseItem[], sort: string, direction: 'asc' | 'desc') {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sort === 'priority') {
      const rankDiff =
        (CONSOLE_PRIORITY_RANK[b.priority] - CONSOLE_PRIORITY_RANK[a.priority]) * factor;
      if (rankDiff !== 0) return rankDiff;
    }

    if (sort === 'amount') {
      const amountDiff = (a.amount - b.amount) * factor;
      if (amountDiff !== 0) return amountDiff;
    }

    const aTime = new Date(a.openedAt).getTime();
    const bTime = new Date(b.openedAt).getTime();
    return (aTime - bTime) * factor;
  });
}

export async function getFinanceCases(
  client: SupabaseClient,
  params: CasesQueryParams
): Promise<FinanceCasesResponse> {
  const type = params.type ?? 'all';
  const pagination = parsePaginationParams(
    { page: params.page, pageSize: params.pageSize, sort: params.sort, direction: params.direction },
    { defaultSort: 'openedAt', defaultDirection: 'desc' }
  );

  const refundService = new RefundQueueReadService(client);
  const disputeService = new DisputeQueueReadService(client);

  const refundFilters = {
    status: params.status as RefundQueueStatusFilter | undefined,
    from: params.from,
    to: params.to,
  };
  const disputeFilters = {
    status: params.status as DisputeQueueStatusFilter | undefined,
    from: params.from,
    to: params.to,
  };

  const [refundsResult, disputesResult] = await Promise.all([
    type === 'disputes'
      ? Promise.resolve({ items: [] as RefundQueueItemDto[] })
      : refundService
          .listRefundQueue(refundFilters, { page: 1, pageSize: CASE_FETCH_LIMIT, sort: 'created_at', direction: 'desc' })
          .then((r) => ({ items: r.items })),
    type === 'refunds'
      ? Promise.resolve({ items: [] as DisputeQueueItemDto[] })
      : disputeService
          .listDisputeQueue(disputeFilters, { page: 1, pageSize: CASE_FETCH_LIMIT, sort: 'created_at', direction: 'desc' })
          .then((r) => ({ items: r.items })),
  ]);

  const profileIds = [
    ...new Set([
      ...refundsResult.items.flatMap((r) => [r.buyerId, r.builderId]),
      ...disputesResult.items.flatMap((d) => [d.buyerId, d.builderId]),
    ]),
  ];
  const collabIds = [
    ...new Set([
      ...refundsResult.items.map((r) => r.collabId),
      ...disputesResult.items.map((d) => d.collabId),
    ]),
  ];

  const [names, collabTitles] = await Promise.all([
    fetchProfileNames(client, profileIds),
    fetchCollabTitles(client, collabIds),
  ]);

  let items: FinanceCaseItem[] = [
    ...refundsResult.items.map((item) => mapRefundToCase(item, names, collabTitles)),
    ...disputesResult.items.map((item) => mapDisputeToCase(item, names, collabTitles)),
  ];

  if (params.priority) {
    items = items.filter((item) => item.priority === params.priority);
  }

  items = filterBySearch(items, params.search, (item) => [
    item.id,
    item.type,
    item.status,
    item.priority,
    item.buyer.id,
    item.buyer.name,
    item.builder.id,
    item.builder.name,
    item.project.id,
    item.project.title,
    item.amount,
  ]);

  const sortField = pagination.sort === 'openedAt' ? 'created_at' : pagination.sort;
  items = sortCases(items, sortField === 'created_at' ? 'openedAt' : sortField, pagination.direction);

  const offset = (pagination.page - 1) * pagination.pageSize;
  const pageItems = items.slice(offset, offset + pagination.pageSize);

  return {
    items: pageItems,
    meta: buildPaginationMeta(items.length, pagination),
  };
}
