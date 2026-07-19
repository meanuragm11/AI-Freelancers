'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ConsolePriority, FinanceCasesResponse } from '@/lib/finance/console/types';

export type CasesTypeTab = 'all' | 'refunds' | 'disputes';

export type FinanceCasesQuery = {
  page: number;
  pageSize: number;
  type?: CasesTypeTab;
  status?: string;
  priority?: ConsolePriority | '';
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
};

type UseFinanceCasesResult = {
  data: FinanceCasesResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useFinanceCases(query: FinanceCasesQuery): UseFinanceCasesResult {
  const [data, setData] = useState<FinanceCasesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      params.set('type', query.type ?? 'all');
      if (query.status) params.set('status', query.status);
      if (query.priority) params.set('priority', query.priority);
      if (query.search?.trim()) params.set('search', query.search.trim());
      if (query.sort) params.set('sort', query.sort);
      if (query.direction) params.set('direction', query.direction);

      const res = await fetch(`/api/founder/finance/cases?${params.toString()}`);

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load reviews (${res.status})`);
      }

      setData((await res.json()) as FinanceCasesResponse);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [
    query.page,
    query.pageSize,
    query.type,
    query.status,
    query.priority,
    query.search,
    query.sort,
    query.direction,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
