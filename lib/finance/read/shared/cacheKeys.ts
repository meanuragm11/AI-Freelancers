/**
 * Finance Read Layer cache key patterns (documentation only — no caching implementation).
 *
 * Future integration: Redis/Upstash layer in GET /api/finance/* route handlers.
 * Invalidate on finance write events (ledger insert, payout status change, refund decision).
 */

/** Overview metrics — short TTL (30–60s). */
export const FINANCE_CACHE_OVERVIEW = 'finance:read:overview:v1';

/** Timeline list — keyed by filter hash. TTL 15–30s. */
export const financeCacheTimelineKey = (filterHash: string): string =>
  `finance:read:timeline:v1:${filterHash}`;

/** Ledger explorer — keyed by filter hash. TTL 30s. */
export const financeCacheLedgerKey = (filterHash: string): string =>
  `finance:read:ledger:v1:${filterHash}`;

/** Payout queue — status + pagination hash. TTL 15s. */
export const financeCachePayoutQueueKey = (filterHash: string): string =>
  `finance:read:payouts:v1:${filterHash}`;

/** Refund queue — status + pagination hash. TTL 15s. */
export const financeCacheRefundQueueKey = (filterHash: string): string =>
  `finance:read:refunds:v1:${filterHash}`;

/** Dispute queue — status + pagination hash. TTL 15s. */
export const financeCacheDisputeQueueKey = (filterHash: string): string =>
  `finance:read:disputes:v1:${filterHash}`;

/** Health checks — longer TTL (60–120s) with event-driven invalidation. */
export const FINANCE_CACHE_HEALTH = 'finance:read:health:v1';

/** Helper to build deterministic filter hashes from sorted key=value pairs. */
export const financeCacheFilterHash = (parts: Record<string, string | number | undefined>): string =>
  Object.entries(parts)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
