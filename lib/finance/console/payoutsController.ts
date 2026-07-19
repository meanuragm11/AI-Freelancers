import type { SupabaseClient } from '@supabase/supabase-js';
import { PayoutQueueReadService } from '@/lib/finance/read';
import type { PayoutQueueFilters } from '@/lib/finance/read/shared/filters';
import type { PayoutQueueItemDto } from '@/lib/finance/read/shared/dto/payouts';
import type { PaginatedResult } from '@/lib/finance/read/shared/pagination';
import { parsePaginationParams } from '@/lib/finance/read/shared/pagination';
import { filterBySearch } from './search';

export interface PayoutsQueryParams {
  page?: string;
  pageSize?: string;
  builder?: string;
  country?: string;
  currency?: string;
  status?: PayoutQueueFilters['status'];
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  from?: string;
  to?: string;
}

function applyClientSidePayoutFilters(
  items: PayoutQueueItemDto[],
  params: PayoutsQueryParams
): PayoutQueueItemDto[] {
  let filtered = items;

  if (params.currency) {
    const currency = params.currency.toUpperCase();
    filtered = filtered.filter((item) => item.currency.toUpperCase() === currency);
  }

  // Country is not tracked on payout DTOs; reserved for future enrichment.
  if (params.country) {
    filtered = filtered.filter((item) =>
      item.builderId.toLowerCase().includes(params.country!.toLowerCase())
    );
  }

  filtered = filterBySearch(filtered, params.search, (item) => [
    item.id,
    item.builderId,
    item.builderName,
    item.status,
    item.source,
    item.withdrawalReference,
    item.invoiceId,
    item.currency,
    item.grossAmountUsd,
    item.netAmountUsd,
  ]);

  return filtered;
}

function groupByStatus(items: PayoutQueueItemDto[]) {
  const groups = {
    pending: [] as PayoutQueueItemDto[],
    processing: [] as PayoutQueueItemDto[],
    completed: [] as PayoutQueueItemDto[],
    failed: [] as PayoutQueueItemDto[],
  };

  for (const item of items) {
    const status = item.status.toLowerCase();
    if (status === 'pending' || status === 'requested') {
      groups.pending.push(item);
    } else if (status === 'processing' || status === 'approved') {
      groups.processing.push(item);
    } else if (status === 'completed' || status === 'paid') {
      groups.completed.push(item);
    } else if (status === 'failed' || status === 'rejected') {
      groups.failed.push(item);
    }
  }

  return {
    pending: groups.pending.length,
    processing: groups.processing.length,
    completed: groups.completed.length,
    failed: groups.failed.length,
  };
}

export async function getFinancePayouts(
  client: SupabaseClient,
  params: PayoutsQueryParams
): Promise<PaginatedResult<PayoutQueueItemDto> & { groups: ReturnType<typeof groupByStatus> }> {
  const service = new PayoutQueueReadService(client);

  const filters: PayoutQueueFilters = {
    builderId: params.builder,
    status: params.status,
    from: params.from,
    to: params.to,
  };

  const needsClientSideFilter = Boolean(params.search || params.currency || params.country);

  const pagination = parsePaginationParams({
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    direction: params.direction,
  });

  const result = await service.listPayoutQueue(filters, {
    page: needsClientSideFilter ? 1 : pagination.page,
    pageSize: needsClientSideFilter ? 500 : pagination.pageSize,
    sort: pagination.sort,
    direction: pagination.direction,
  });

  let items = result.items;
  if (needsClientSideFilter) {
    items = applyClientSidePayoutFilters(items, params);
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.max(1, Math.min(Number(params.pageSize ?? 50), 200));
    const offset = (page - 1) * pageSize;
    const pageItems = items.slice(offset, offset + pageSize);
    return {
      items: pageItems,
      meta: {
        total: items.length,
        page,
        pageSize,
        totalPages: items.length === 0 ? 0 : Math.ceil(items.length / pageSize),
      },
      groups: groupByStatus(items),
    };
  }

  return {
    ...result,
    groups: groupByStatus(result.items),
  };
}
