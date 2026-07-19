/**
 * LedgerExplorerReadService
 *
 * Purpose: Searchable, paginated view of finance_ledger_entries for founder audit.
 * Responsibilities: Filter + paginate ledger entries via repository; return LedgerEntryDto only.
 * Future integration: GET /api/finance/ledger, /founder/finance/ledger explorer page.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_TABLES } from '../../constants';
import { LedgerRepository } from '../../repositories';
import type { LedgerEntryType } from '../../enums';
import type { LedgerFilters } from '../shared/filters';
import type { LedgerEntryDto } from '../shared/dto/ledger';
import type { PaginatedResult, PaginationParams } from '../shared/pagination';
import {
  buildPaginationMeta,
  paginationOffset,
  parsePaginationParams,
} from '../shared/pagination';
import { applyDateRange, mapLedgerEntryToDto } from '../shared/mappers';

export class LedgerExplorerReadService {
  private readonly ledgerRepo: LedgerRepository;

  constructor(private readonly client: SupabaseClient) {
    this.ledgerRepo = new LedgerRepository(client);
  }

  async searchLedger(
    filters: LedgerFilters = {},
    paginationInput: Partial<PaginationParams> = {}
  ): Promise<PaginatedResult<LedgerEntryDto>> {
    const pagination = parsePaginationParams(paginationInput, {
      defaultSort: 'created_at',
      defaultDirection: 'desc',
    });
    const offset = paginationOffset(pagination);

    const [count, rows] = await Promise.all([
      this.countFiltered(filters),
      this.fetchFiltered(filters, pagination, offset),
    ]);

    return {
      items: rows.map(mapLedgerEntryToDto),
      meta: buildPaginationMeta(count, pagination),
    };
  }

  private async countFiltered(filters: LedgerFilters): Promise<number> {
    let query = this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('*', { count: 'exact', head: true });

    query = this.applyFilters(query, filters);

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  private async fetchFiltered(
    filters: LedgerFilters,
    pagination: PaginationParams,
    offset: number
  ) {
    if (this.canUseRepository(filters)) {
      return this.ledgerRepo.list({
        buyer_id: filters.buyerId,
        builder_id: filters.builderId,
        collab_id: filters.collabId,
        transaction_id: filters.transactionId,
        entry_type: filters.entryType as LedgerEntryType | undefined,
        limit: pagination.pageSize,
        offset,
      });
    }

    let query = this.client
      .from(FINANCE_TABLES.ledgerEntries)
      .select('*')
      .order(pagination.sort, { ascending: pagination.direction === 'asc' })
      .range(offset, offset + pagination.pageSize - 1);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  private canUseRepository(filters: LedgerFilters): boolean {
    return !filters.from && !filters.to && !filters.direction && !filters.invoiceId;
  }

  private applyFilters<T extends { eq: (col: string, val: string) => T; gte: (col: string, val: string) => T; lte: (col: string, val: string) => T }>(
    query: T,
    filters: LedgerFilters
  ): T {
    let next = query;
    if (filters.buyerId) next = next.eq('buyer_id', filters.buyerId);
    if (filters.builderId) next = next.eq('builder_id', filters.builderId);
    if (filters.collabId) next = next.eq('collab_id', filters.collabId);
    if (filters.transactionId) next = next.eq('transaction_id', filters.transactionId);
    if (filters.invoiceId) next = next.eq('invoice_id', filters.invoiceId);
    if (filters.entryType) next = next.eq('entry_type', filters.entryType);
    if (filters.direction) next = next.eq('direction', filters.direction);
    next = applyDateRange(next, 'created_at', filters.from, filters.to);
    return next;
  }
}
