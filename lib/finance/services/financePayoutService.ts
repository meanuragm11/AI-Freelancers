/**
 * Builder payout orchestration for Finance V2.
 * Does not execute Razorpay transfers in Phase 1.
 *
 * Future integration points:
 * - Milestone accept: createPayout after invoice generation
 * - Withdrawal API: link payout to builder_withdrawals
 * - Founder payout queue: completePayout with provider reference
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { PAYOUT_ENGINE_ENABLED } from '../constants';
import { FinanceEventType, PayoutStatus } from '../enums';
import { PayoutRepository } from '../repositories';
import type { FinancePayout, FinancePayoutInsert } from '../types';
import {
  CurrencyValidator,
  FinanceValidationError,
  MoneyValidator,
  StateTransitionValidator,
} from '../validators';
import { computeNetAmount, nowIso } from '../utils';
import { FinanceEventService } from './financeEventService';

export type CreatePayoutInput = {
  builderId: string;
  invoiceId?: string | null;
  grossAmount: number;
  platformFee?: number;
  currency?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  actorId?: string | null;
};

export class FinancePayoutService {
  private readonly payoutRepo: PayoutRepository;
  private readonly eventService: FinanceEventService;

  constructor(client: SupabaseClient) {
    this.payoutRepo = new PayoutRepository(client);
    this.eventService = new FinanceEventService(client);
  }

  /**
   * Queue a builder payout after milestone release or invoice creation.
   * Invoke when PAYOUT_ENGINE_ENABLED is true.
   */
  async createPayout(input: CreatePayoutInput): Promise<FinancePayout | null> {
    if (!PAYOUT_ENGINE_ENABLED) return null;

    const gross = MoneyValidator.requirePositive(input.grossAmount, 'gross_amount');
    const platformFee = MoneyValidator.requireNonNegative(
      input.platformFee ?? 0,
      'platform_fee'
    );
    const net = computeNetAmount(gross, platformFee, 0);
    const currency = CurrencyValidator.requireSupported(input.currency ?? 'USD');

    const row: FinancePayoutInsert = {
      builder_id: input.builderId,
      invoice_id: input.invoiceId ?? null,
      gross_amount: gross,
      platform_fee: platformFee,
      net_amount: net,
      currency,
      status: PayoutStatus.Pending,
      payment_method: input.paymentMethod ?? null,
      reference: null,
      notes: input.notes ?? null,
    };

    const payout = await this.payoutRepo.insert(row);

    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.PayoutCreated,
      actor_id: input.actorId ?? null,
      buyer_id: null,
      builder_id: input.builderId,
      collab_id: null,
      milestone_id: null,
      transaction_id: null,
      invoice_id: input.invoiceId ?? null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: { payout_id: payout.id, net_amount: net },
    });

    return payout;
  }

  /**
   * Mark payout as completed after provider transfer succeeds.
   * Invoke from withdrawal/payout webhook handler.
   */
  async completePayout(
    payoutId: string,
    params: {
      reference: string;
      processedBy: string;
      paymentMethod?: string;
    }
  ): Promise<FinancePayout | null> {
    if (!PAYOUT_ENGINE_ENABLED) return null;

    const updated = await this.founderCompletePayout(payoutId, {
      transactionReference: params.reference,
      processedBy: params.processedBy,
      paymentMethod: params.paymentMethod,
    });

    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.PayoutCompleted,
      actor_id: params.processedBy,
      buyer_id: null,
      builder_id: updated.builder_id,
      collab_id: null,
      milestone_id: null,
      transaction_id: null,
      invoice_id: updated.invoice_id,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: { payout_id: updated.id, reference: params.reference },
    });

    return updated;
  }

  /**
   * Founder-recorded payout completion. Does not gate on PAYOUT_ENGINE_ENABLED.
   * Caller owns finance event + ledger writes (founder API path).
   */
  async founderCompletePayout(
    payoutId: string,
    params: {
      transactionReference: string;
      processedBy: string;
      notes?: string | null;
      paymentMethod?: string;
    }
  ): Promise<FinancePayout> {
    const existing = await this.payoutRepo.findById(payoutId);
    if (!existing) {
      throw new FinanceValidationError('Payout not found', 'id');
    }

    if (existing.status === PayoutStatus.Completed) {
      throw new FinanceValidationError('Payout is already completed', 'status');
    }

    if (
      existing.status !== PayoutStatus.Pending &&
      existing.status !== PayoutStatus.Processing
    ) {
      throw new FinanceValidationError(
        `Payout cannot be completed from status "${existing.status}"`,
        'status'
      );
    }

    if (existing.status === PayoutStatus.Pending) {
      StateTransitionValidator.payout(existing.status, PayoutStatus.Processing);
      await this.payoutRepo.update(payoutId, { status: PayoutStatus.Processing });
    }

    StateTransitionValidator.payout(PayoutStatus.Processing, PayoutStatus.Completed);

    return this.payoutRepo.update(payoutId, {
      status: PayoutStatus.Completed,
      reference: params.transactionReference,
      notes: params.notes ?? existing.notes,
      processed_by: params.processedBy,
      processed_at: nowIso(),
      payment_method: params.paymentMethod ?? existing.payment_method,
    });
  }
}
