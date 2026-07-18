'use client';

import { useEffect, useState } from 'react';
import { fetchBuildersRecognitionBatch } from '@/lib/arena/badges/client';
import { getPrimaryBadge, type RecognitionBadgeGrant } from '@/lib/arena/badges/types';

export function useBuilderRecognitionMap(builderIds: string[]) {
  const [badgeMap, setBadgeMap] = useState<Record<string, RecognitionBadgeGrant[]>>({});
  const [loading, setLoading] = useState(false);

  const idsKey = [...new Set(builderIds.filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!idsKey) {
      setBadgeMap({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchBuildersRecognitionBatch(idsKey.split(','))
      .then((map) => {
        if (!cancelled) setBadgeMap(map);
      })
      .catch((error) => {
        console.error('Failed to load recognition badges:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const getPrimary = (builderId: string) =>
    getPrimaryBadge(badgeMap[builderId] ?? []);

  return { badgeMap, getPrimary, loading };
}
