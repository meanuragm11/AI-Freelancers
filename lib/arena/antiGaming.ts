import type { ArenaEventType } from './types';

/** Daily caps for activity-derived signals — prevents spam farming */
export const ARENA_DAILY_ACTIVITY_CAPS: Partial<Record<ArenaEventType, number>> = {
  profile_updated: 1,
  login: 3,
  profile_view: 50,
  profile_shared: 5,
};

/** Minimum interval (ms) before the same event type counts again */
export const ARENA_EVENT_COOLDOWN_MS: Partial<Record<ArenaEventType, number>> = {
  profile_updated: 86_400_000,
  solution_published: 3_600_000,
};

export function buildEventIdempotencyKey(
  builderId: string,
  eventType: ArenaEventType,
  dedupeKey: string
): string {
  return `${builderId}:${eventType}:${dedupeKey}`;
}

export function clampDailyActivity(count: number, eventType: ArenaEventType): number {
  const cap = ARENA_DAILY_ACTIVITY_CAPS[eventType];
  if (cap == null) return count;
  return Math.min(count, cap);
}

/** Penalize suspicious bursts — repeated micro-edits within a short window */
export function dampenRepeatedEdits(editCount: number, windowHours = 24): number {
  if (editCount <= 1) return editCount;
  const excess = editCount - 1;
  const dampening = Math.max(0.1, 1 - excess * 0.15);
  return 1 + excess * dampening * 0.25;
}

/** Filter artificial traffic spikes beyond organic daily cap */
export function sanitizeTrafficSignal(rawViews: number, profileAgeDays: number): number {
  const organicCap = Math.max(20, profileAgeDays * 5);
  if (rawViews <= organicCap) return rawViews;
  const excess = rawViews - organicCap;
  return organicCap + Math.sqrt(excess) * 2;
}
