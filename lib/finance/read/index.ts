/**
 * Finance Read Layer — aggregation services for the future Finance Command Center UI.
 *
 * Read-only. No ledger writes, no payment side effects.
 * Future integration: GET /api/finance/* route handlers inject SupabaseClient (service role).
 */

export * from './shared';
export * from './overview';
export * from './timeline';
export * from './ledger';
export * from './payouts';
export * from './refunds';
export * from './disputes';
export * from './health';

export { FinanceOverviewReadService } from './overview';
export { FinanceTimelineReadService } from './timeline';
export { LedgerExplorerReadService } from './ledger';
export { PayoutQueueReadService } from './payouts';
export { RefundQueueReadService } from './refunds';
export { DisputeQueueReadService } from './disputes';
export { FinanceHealthReadService } from './health';
