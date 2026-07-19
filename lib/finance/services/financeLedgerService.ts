/**
 * Business orchestration for append-only finance ledger entries.
 * No UI/API wiring — invoked by future payment lifecycle integrations.
 *
 * Future integration points:
 * - fulfillRazorpayPayment: escrow_deposit + platform_fee entries
 * - milestone accept: milestone_release + payout trigger
 * - refund pipeline: escrow_refund + refund entries
 * - withdrawal workflow: withdrawal entries
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { LEDGER_ENABLED } from '../constants';
import { FinanceEventType } from '../enums';
import { LedgerRepository } from '../repositories';
import type { FinanceLedgerEntry, FinanceLedgerEntryInsert } from '../types';
import { IdempotencyValidator, LedgerValidator } from '../validators';
import { FinanceEventService } from './financeEventService';

export class FinanceLedgerService {
  private readonly ledgerRepo: LedgerRepository;
  private readonly eventService: FinanceEventService;

  constructor(client: SupabaseClient) {
    this.ledgerRepo = new LedgerRepository(client);
    this.eventService = new FinanceEventService(client);
  }

  /**
   * Append a validated ledger entry. Idempotent on idempotency_key.
   * Invoke after successful payment capture when LEDGER_ENABLED is true.
   */
  async recordLedgerEntry(
    entry: FinanceLedgerEntryInsert
  ): Promise<FinanceLedgerEntry | null> {
    if (!LEDGER_ENABLED) return null;

    const validated = LedgerValidator.validateInsert(entry);
    const key = IdempotencyValidator.requireKey(validated.idempotency_key);

    const existing = await this.ledgerRepo.findByIdempotencyKey(key);
    if (existing) return existing;

    const created = await this.ledgerRepo.insert(validated);

    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.LedgerEntryRecorded,
      actor_id: null,
      buyer_id: created.buyer_id,
      builder_id: created.builder_id,
      collab_id: created.collab_id,
      milestone_id: created.milestone_id,
      transaction_id: created.transaction_id,
      invoice_id: created.invoice_id,
      refund_request_id: created.refund_request_id,
      withdrawal_id: created.withdrawal_id,
      dispute_id: created.dispute_id,
      metadata: {
        ledger_entry_id: created.id,
        entry_type: created.entry_type,
        net_amount_usd: created.net_amount_usd,
      },
    });

    return created;
  }

  async getLedgerEntry(id: string): Promise<FinanceLedgerEntry | null> {
    return this.ledgerRepo.findById(id);
  }
}
