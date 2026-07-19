/**
 * Finance events domain module — immutable audit timeline.
 *
 * Future integration: import from @/lib/finance/events in lifecycle hooks.
 */

export type { FinanceEvent, FinanceEventInsert, FinanceEventFilters } from '../types';
export { FinanceEventRepository } from '../repositories';
export { FinanceEventService } from '../services';
