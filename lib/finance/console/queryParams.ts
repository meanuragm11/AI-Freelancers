import type { SortDirection } from '@/lib/finance/read/shared/pagination';

export function getSearchParam(
  searchParams: URLSearchParams,
  key: string
): string | undefined {
  const value = searchParams.get(key)?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function parsePaginationFromSearchParams(searchParams: URLSearchParams) {
  return {
    page: getSearchParam(searchParams, 'page'),
    pageSize: getSearchParam(searchParams, 'pageSize'),
    sort: getSearchParam(searchParams, 'sort'),
    direction: getSearchParam(searchParams, 'direction') as SortDirection | undefined,
  };
}

export function parseDateRangeFromSearchParams(searchParams: URLSearchParams) {
  const date = getSearchParam(searchParams, 'date');
  const from = getSearchParam(searchParams, 'from') ?? date;
  const to = getSearchParam(searchParams, 'to') ?? date;
  return { from, to };
}
