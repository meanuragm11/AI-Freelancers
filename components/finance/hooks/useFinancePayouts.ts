'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PayoutQueueItemDto } from '@/lib/finance/read/shared/dto/payouts';

export type PayoutStatusTab = 'pending' | 'processing' | 'completed';

export type FinancePayoutsQuery = {
  page: number;
  pageSize: number;
  builder?: string;
  country?: string;
  currency?: string;
  status?: PayoutStatusTab | '';
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
};

export type FinancePayoutsResponse = {
  items: PayoutQueueItemDto[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  groups: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
};

type UseFinancePayoutsResult = {
  data: FinancePayoutsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useFinancePayouts(query: FinancePayoutsQuery): UseFinancePayoutsResult {
  const [data, setData] = useState<FinancePayoutsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      if (query.builder) params.set('builder', query.builder);
      if (query.country) params.set('country', query.country);
      if (query.currency) params.set('currency', query.currency);
      if (query.status) params.set('status', query.status);
      if (query.search?.trim()) params.set('search', query.search.trim());
      if (query.sort) params.set('sort', query.sort);
      if (query.direction) params.set('direction', query.direction);

      const res = await fetch(`/api/founder/finance/payouts?${params.toString()}`);

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load payouts (${res.status})`);
      }

      setData((await res.json()) as FinancePayoutsResponse);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, [
    query.page,
    query.pageSize,
    query.builder,
    query.country,
    query.currency,
    query.status,
    query.search,
    query.sort,
    query.direction,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
