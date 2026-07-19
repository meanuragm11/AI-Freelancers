'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InboxResponse } from '@/lib/finance/console/types';

type UseFinanceInboxResult = {
  data: InboxResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useFinanceInbox(search: string): UseFinanceInboxResult {
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const trimmed = search.trim();
      if (trimmed) params.set('search', trimmed);

      const query = params.toString();
      const res = await fetch(`/api/founder/finance/inbox${query ? `?${query}` : ''}`);

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load inbox (${res.status})`);
      }

      setData((await res.json()) as InboxResponse);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
