/**
 * Row types for finance_events (immutable audit timeline).
 *
 * Future integration: FinanceEventService from all payment lifecycle hooks.
 */

import type { FinanceEventType } from '../enums';

export interface FinanceEvent {
  id: string;
  event_type: FinanceEventType;
  actor_id: string | null;
  buyer_id: string | null;
  builder_id: string | null;
  collab_id: string | null;
  milestone_id: string | null;
  transaction_id: string | null;
  invoice_id: string | null;
  refund_request_id: string | null;
  withdrawal_id: string | null;
  dispute_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type FinanceEventInsert = Omit<FinanceEvent, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

/** Events are append-only — no row updates permitted. */
export type FinanceEventUpdate = never;

export interface FinanceEventFilters {
  event_type?: FinanceEventType;
  collab_id?: string;
  transaction_id?: string;
  buyer_id?: string;
  builder_id?: string;
  limit?: number;
  offset?: number;
}
