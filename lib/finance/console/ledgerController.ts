import type { SupabaseClient } from '@supabase/supabase-js';
import { LedgerExplorerReadService } from '@/lib/finance/read';
import type { LedgerFilters } from '@/lib/finance/read/shared/filters';
import type { LedgerEntryDto } from '@/lib/finance/read/shared/dto/ledger';
import type { PaginatedResult } from '@/lib/finance/read/shared/pagination';
import { parsePaginationParams } from '@/lib/finance/read/shared/pagination';
import { filterBySearch } from './search';

export interface LedgerQueryParams {
  builder?: string;
  buyer?: string;
  invoice?: string;
  project?: string;
  collab?: string;
  transaction?: string;
  ledgerId?: string;
  date?: string;
  from?: string;
  to?: string;
  entryType?: string;
  direction?: string;
  currency?: string;
  page?: string;
  pageSize?: string;
  search?: string;
  sort?: string;
  directionParam?: 'asc' | 'desc';
}

function applyClientSideLedgerFilters(
  items: LedgerEntryDto[],
  params: LedgerQueryParams
): LedgerEntryDto[] {
  let filtered = items;

  if (params.ledgerId) {
    filtered = filtered.filter((item) => item.id === params.ledgerId);
  }

  if (params.currency) {
    const currency = params.currency.toUpperCase();
    filtered = filtered.filter((item) => item.currency.toUpperCase() === currency);
  }

  filtered = filterBySearch(filtered, params.search, (item) => [
    item.id,
    item.entryType,
    item.direction,
    item.accountType,
    item.buyerId,
    item.builderId,
    item.collabId,
    item.transactionId,
    item.invoiceId,
    item.refundRequestId,
    item.withdrawalId,
    item.disputeId,
    item.paymentProvider,
    item.providerReference,
    item.currency,
    item.grossAmountUsd,
    item.netAmountUsd,
  ]);

  return filtered;
}

export async function getFinanceLedger(
  client: SupabaseClient,
  params: LedgerQueryParams
): Promise<PaginatedResult<LedgerEntryDto>> {
  const service = new LedgerExplorerReadService(client);

  const collabId = params.collab ?? params.project;
  const dateRangeFrom = params.from ?? params.date;
  const dateRangeTo = params.to ?? params.date;

  const filters: LedgerFilters = {
    builderId: params.builder,
    buyerId: params.buyer,
    invoiceId: params.invoice,
    collabId,
    transactionId: params.transaction,
    entryType: params.entryType,
    direction: params.direction,
    from: dateRangeFrom,
    to: dateRangeTo,
  };

  const needsClientSideFilter = Boolean(params.search || params.currency || params.ledgerId);

  const pagination = parsePaginationParams({
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    direction: params.directionParam,
  });

  const result = await service.searchLedger(filters, {
    page: needsClientSideFilter ? 1 : pagination.page,
    pageSize: needsClientSideFilter ? 500 : pagination.pageSize,
    sort: pagination.sort,
    direction: pagination.direction,
  });

  if (!needsClientSideFilter) {
    return result;
  }

  const items = applyClientSideLedgerFilters(result.items, params);
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.max(1, Math.min(Number(params.pageSize ?? 50), 200));
  const offset = (page - 1) * pageSize;

  return {
    items: items.slice(offset, offset + pageSize),
    meta: {
      total: items.length,
      page,
      pageSize,
      totalPages: items.length === 0 ? 0 : Math.ceil(items.length / pageSize),
    },
  };
}
