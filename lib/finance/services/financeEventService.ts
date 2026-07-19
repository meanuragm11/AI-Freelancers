/**
 * Business orchestration for immutable finance_events timeline.
 *
 * Future integration points:
 * - Webhook processor: payment_captured events
 * - EscrowFinanceService: escrow_funded / frozen / released
 * - Refund and payout services: refund_*, payout_* events
 * - Reconciliation: reconciliation_started / completed
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_EVENTS_ENABLED } from '../constants';
import { FINANCE_EVENT_TYPES, type FinanceEventType } from '../enums';
import { FinanceEventRepository } from '../repositories';
import type { FinanceEvent, FinanceEventInsert } from '../types';
import { FinanceValidationError } from '../validators';

export class FinanceEventService {
  private readonly eventRepo: FinanceEventRepository;

  constructor(client: SupabaseClient) {
    this.eventRepo = new FinanceEventRepository(client);
  }

  /**
   * Append a finance audit event. No-op when FINANCE_EVENTS_ENABLED is false.
   * Invoke from any Finance V2 service after a domain state change.
   */
  async recordFinanceEvent(event: FinanceEventInsert): Promise<FinanceEvent | null> {
    if (!FINANCE_EVENTS_ENABLED) return null;

    if (
      typeof event.event_type !== 'string' ||
      !FINANCE_EVENT_TYPES.includes(event.event_type as FinanceEventType)
    ) {
      throw new FinanceValidationError('event_type is invalid', 'event_type');
    }

    return this.eventRepo.insert({
      ...event,
      metadata: event.metadata ?? {},
    });
  }

  async getFinanceEvent(id: string): Promise<FinanceEvent | null> {
    return this.eventRepo.findById(id);
  }
}
