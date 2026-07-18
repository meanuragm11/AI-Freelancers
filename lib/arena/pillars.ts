import type { ArenaPillarId } from './types';

/**
 * Internal pillar weights — NEVER export to UI or public API responses.
 * TRUST is intentionally the highest-weight pillar.
 */
export const ARENA_PILLAR_WEIGHTS: Record<ArenaPillarId, number> = {
  trust: 0.4,
  expertise: 0.22,
  activity: 0.15,
  community: 0.1,
  growth: 0.13,
};

export const ARENA_PILLAR_LABELS: Record<ArenaPillarId, string> = {
  trust: 'Trust',
  expertise: 'Expertise',
  activity: 'Activity',
  community: 'Community',
  growth: 'Growth',
};
