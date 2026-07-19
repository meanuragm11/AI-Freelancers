/**
 * Date/time helpers for finance queries and reconciliation windows.
 *
 * Future integration: reconciliation date ranges, dashboard time filters.
 */

/** ISO-8601 string for the current instant. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Start of UTC day as ISO string for range queries. */
export function startOfUtcDay(date: Date = new Date()): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** End of UTC day as ISO string for range queries. */
export function endOfUtcDay(date: Date = new Date()): string {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Days-ago window start (inclusive) from now. */
export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}
