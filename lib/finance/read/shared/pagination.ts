/**
 * Shared pagination primitives for Finance Read Layer list endpoints.
 *
 * Future integration: GET /api/finance/* route handlers parse query strings via parsePaginationParams.
 */

import { FINANCE_DEFAULT_PAGE_SIZE } from '../../constants';

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  pageSize: number;
  sort: string;
  direction: SortDirection;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Alias used by read-layer DTO barrel exports. */
export type PaginatedResponse<T> = PaginatedResult<T>;

export interface ParsePaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  defaultSort?: string;
  defaultDirection?: SortDirection;
  maxPageSize?: number;
}

const DEFAULT_MAX_PAGE_SIZE = 200;

export function parsePaginationParams(
  input: Partial<PaginationParams> | Record<string, string | undefined> = {},
  options: ParsePaginationOptions = {}
): PaginationParams {
  const defaultPage = options.defaultPage ?? 1;
  const defaultPageSize = options.defaultPageSize ?? FINANCE_DEFAULT_PAGE_SIZE;
  const defaultSort = options.defaultSort ?? 'created_at';
  const defaultDirection = options.defaultDirection ?? 'desc';
  const maxPageSize = options.maxPageSize ?? DEFAULT_MAX_PAGE_SIZE;

  const rawPage = 'page' in input ? input.page : undefined;
  const rawPageSize = 'pageSize' in input ? input.pageSize : undefined;
  const rawSort = 'sort' in input ? input.sort : undefined;
  const rawDirection = 'direction' in input ? input.direction : undefined;

  const pageNum = Number(rawPage ?? defaultPage);
  const pageSizeNum = Number(rawPageSize ?? defaultPageSize);

  const page = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : defaultPage;
  const pageSize =
    Number.isFinite(pageSizeNum) && pageSizeNum > 0
      ? Math.min(Math.floor(pageSizeNum), maxPageSize)
      : defaultPageSize;

  const direction: SortDirection =
    rawDirection === 'asc' || rawDirection === 'desc' ? rawDirection : defaultDirection;

  const sort =
    typeof rawSort === 'string' && rawSort.trim().length > 0 ? rawSort.trim() : defaultSort;

  return { page, pageSize, sort, direction };
}

export function paginationOffset(params: PaginationParams): number {
  return (params.page - 1) * params.pageSize;
}

export function buildPaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / params.pageSize);
  return {
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
  };
}

export function paginateArray<T>(items: T[], params: PaginationParams): PaginatedResult<T> {
  const offset = paginationOffset(params);
  const slice = items.slice(offset, offset + params.pageSize);
  return {
    items: slice,
    meta: buildPaginationMeta(items.length, params),
  };
}
