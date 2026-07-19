/**
 * Idempotency key and provider reference builders for ledger entries.
 *
 * Future integration: fulfillRazorpayPayment, webhook dedupe, milestone accept.
 */

import type { LedgerEntryType } from '../enums';

/** Build a deterministic idempotency key from domain identifiers. */
export function buildLedgerIdempotencyKey(
  entryType: LedgerEntryType,
  ...parts: (string | number | null | undefined)[]
): string {
  const normalized = parts
    .filter((p) => p !== null && p !== undefined && String(p).length > 0)
    .map((p) => String(p).replace(/[^a-zA-Z0-9_-]/g, '_'))
    .join(':');
  return `ledger:${entryType}:${normalized}`;
}

/** Build a provider-scoped external reference string. */
export function buildProviderReference(
  provider: string,
  externalId: string
): string {
  return `${provider}:${externalId}`;
}

/** Parse entry type prefix from an idempotency key (for debugging). */
export function parseIdempotencyPrefix(key: string): string | null {
  const match = /^ledger:([^:]+):/.exec(key);
  return match ? match[1] : null;
}
