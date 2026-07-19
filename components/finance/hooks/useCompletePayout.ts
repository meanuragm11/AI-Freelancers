'use client';

import { useCallback, useState } from 'react';
import type { CompletedPayoutDto } from '@/lib/finance/console/completePayoutController';
import type { PayoutQueueItemDto, PayoutQueueSource } from '@/lib/finance/read/shared/dto/payouts';

export type CompletePayoutInput = {
  payoutId: string;
  source: PayoutQueueSource;
  transactionReference: string;
  notes?: string;
  receiptUrl?: string;
};

type UseCompletePayoutResult = {
  complete: (input: CompletePayoutInput) => Promise<CompletedPayoutDto>;
  loading: boolean;
  error: string | null;
  resetError: () => void;
};

export function useCompletePayout(): UseCompletePayoutResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const complete = useCallback(async (input: CompletePayoutInput): Promise<CompletedPayoutDto> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/founder/finance/payouts/${encodeURIComponent(input.payoutId)}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: input.source,
            transactionReference: input.transactionReference,
            notes: input.notes?.trim() || undefined,
            receiptUrl: input.receiptUrl?.trim() || undefined,
          }),
        }
      );

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        payout?: CompletedPayoutDto;
      };

      if (!res.ok) {
        throw new Error(body.error ?? `Failed to record payout (${res.status})`);
      }

      if (!body.payout) {
        throw new Error('Invalid response from payout completion API');
      }

      return body.payout;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record payout';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { complete, loading, error, resetError };
}

export function isPayoutCompletable(item: PayoutQueueItemDto): boolean {
  const status = item.status.toLowerCase();
  if (status === 'completed' || status === 'paid') return false;
  if (item.source === 'finance_v2') {
    return status === 'pending' || status === 'processing';
  }
  if (item.source === 'withdrawal') {
    return status === 'processing' || status === 'approved';
  }
  if (item.source === 'invoice') {
    return status === 'processing';
  }
  return false;
}
