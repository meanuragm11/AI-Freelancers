/** Client-side helpers for recognition badges */

import type { RecognitionBadgeGrant } from './types';
import { getPrimaryBadge } from './types';

export async function fetchBuilderRecognition(
  builderId: string
): Promise<{ badges: RecognitionBadgeGrant[]; primaryBadge: RecognitionBadgeGrant | null }> {
  const response = await fetch(`/api/builders/${builderId}/recognition`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to load recognition badges');
  }
  return {
    badges: result.badges ?? [],
    primaryBadge: result.primaryBadge ?? getPrimaryBadge(result.badges ?? []),
  };
}

export async function fetchBuildersRecognitionBatch(
  builderIds: string[]
): Promise<Record<string, RecognitionBadgeGrant[]>> {
  if (builderIds.length === 0) return {};

  const response = await fetch(
    `/api/builders/recognition?ids=${encodeURIComponent(builderIds.join(','))}`
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to load recognition badges');
  }
  return result.badgesByBuilder ?? {};
}
