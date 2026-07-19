/**
 * Escrow state machine orchestration for Finance V2.
 * Does not modify legacy collab/milestone escrow columns in Phase 1.
 *
 * Future integration points:
 * - fulfillRazorpayPayment: transition pending → funded
 * - Dispute open: funded → frozen
 * - Milestone accept / workspace billing: funded → released
 * - Refund completion: funded/frozen → refunded
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FINANCE_V2 } from '../constants';
import {
  EscrowStatus,
  FinanceAccountType,
  FinanceDirection,
  FinanceEventType,
  LedgerEntryType,
} from '../enums';
import type { FinanceLedgerEntryInsert } from '../types';
import { StateTransitionValidator } from '../validators';
import { buildLedgerIdempotencyKey } from '../utils';
import { FinanceEventService } from './financeEventService';
import { FinanceLedgerService } from './financeLedgerService';

export type EscrowContext = {
  collabId: string;
  milestoneId?: string | null;
  transactionId?: string | null;
  buyerId: string;
  builderId: string;
  grossAmountUsd: number;
  platformFeeUsd?: number;
  currency?: string;
  actorId?: string | null;
  providerReference?: string | null;
};

export class EscrowFinanceService {
  private readonly ledgerService: FinanceLedgerService;
  private readonly eventService: FinanceEventService;

  constructor(client: SupabaseClient) {
    this.ledgerService = new FinanceLedgerService(client);
    this.eventService = new FinanceEventService(client);
  }

  /**
   * Record escrow funding after payment capture.
   * Invoke from fulfillRazorpayPayment when FINANCE_V2 is enabled.
   */
  async fundEscrow(ctx: EscrowContext, currentStatus = EscrowStatus.Pending): Promise<void> {
    if (!FINANCE_V2) return;

    StateTransitionValidator.escrow(currentStatus, EscrowStatus.Funded);

    const platformFee = ctx.platformFeeUsd ?? 0;
    const net = ctx.grossAmountUsd - platformFee;

    const entry: FinanceLedgerEntryInsert = {
      entry_type: LedgerEntryType.EscrowDeposit,
      direction: FinanceDirection.Debit,
      account_type: FinanceAccountType.EscrowHold,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId,
      milestone_id: ctx.milestoneId ?? null,
      transaction_id: ctx.transactionId ?? null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      currency: ctx.currency ?? 'USD',
      gross_amount_usd: ctx.grossAmountUsd,
      platform_fee_usd: platformFee,
      tax_amount_usd: 0,
      net_amount_usd: net,
      payment_provider: null,
      provider_reference: ctx.providerReference ?? null,
      idempotency_key: buildLedgerIdempotencyKey(
        LedgerEntryType.EscrowDeposit,
        ctx.transactionId,
        ctx.milestoneId
      ),
      metadata: { escrow_status: EscrowStatus.Funded },
    };

    await this.ledgerService.recordLedgerEntry(entry);
    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.EscrowFunded,
      actor_id: ctx.actorId ?? ctx.buyerId,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId,
      milestone_id: ctx.milestoneId ?? null,
      transaction_id: ctx.transactionId ?? null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: { gross_amount_usd: ctx.grossAmountUsd },
    });
  }

  /**
   * Freeze escrow during dispute review.
   * Invoke when a dispute is opened against funded escrow.
   */
  async freezeEscrow(
    ctx: Pick<EscrowContext, 'collabId' | 'milestoneId' | 'transactionId' | 'buyerId' | 'builderId' | 'actorId'>,
    currentStatus = EscrowStatus.Funded
  ): Promise<void> {
    if (!FINANCE_V2) return;

    StateTransitionValidator.escrow(currentStatus, EscrowStatus.Frozen);

    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.EscrowFrozen,
      actor_id: ctx.actorId ?? null,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId,
      milestone_id: ctx.milestoneId ?? null,
      transaction_id: ctx.transactionId ?? null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: {},
    });
  }

  /**
   * Release escrow to builder on milestone acceptance.
   * Invoke from milestone accept route when FINANCE_V2 is enabled.
   */
  async releaseEscrow(
    ctx: EscrowContext,
    currentStatus = EscrowStatus.Funded
  ): Promise<void> {
    if (!FINANCE_V2) return;

    StateTransitionValidator.escrow(currentStatus, EscrowStatus.Released);

    const platformFee = ctx.platformFeeUsd ?? 0;
    const net = ctx.grossAmountUsd - platformFee;

    const entry: FinanceLedgerEntryInsert = {
      entry_type: LedgerEntryType.EscrowRelease,
      direction: FinanceDirection.Credit,
      account_type: FinanceAccountType.BuilderWallet,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId,
      milestone_id: ctx.milestoneId ?? null,
      transaction_id: ctx.transactionId ?? null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      currency: ctx.currency ?? 'USD',
      gross_amount_usd: ctx.grossAmountUsd,
      platform_fee_usd: platformFee,
      tax_amount_usd: 0,
      net_amount_usd: net,
      payment_provider: null,
      provider_reference: ctx.providerReference ?? null,
      idempotency_key: buildLedgerIdempotencyKey(
        LedgerEntryType.EscrowRelease,
        ctx.milestoneId,
        ctx.transactionId
      ),
      metadata: { escrow_status: EscrowStatus.Released },
    };

    await this.ledgerService.recordLedgerEntry(entry);
    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.EscrowReleased,
      actor_id: ctx.actorId ?? null,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId,
      milestone_id: ctx.milestoneId ?? null,
      transaction_id: ctx.transactionId ?? null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: { net_amount_usd: net },
    });
  }

  /**
   * Record refund ledger reversal after Razorpay refund completes.
   * Invoke from lib/refunds/service.ts execute path.
   */
  async recordRefund(
    ctx: EscrowContext & { refundRequestId: string; disputeId?: string | null },
    currentStatus = EscrowStatus.Funded
  ): Promise<void> {
    if (!FINANCE_V2) return;

    StateTransitionValidator.escrow(currentStatus, EscrowStatus.Refunded);

    const entry: FinanceLedgerEntryInsert = {
      entry_type: LedgerEntryType.Refund,
      direction: FinanceDirection.Credit,
      account_type: FinanceAccountType.BuyerWallet,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId,
      milestone_id: ctx.milestoneId ?? null,
      transaction_id: ctx.transactionId ?? null,
      invoice_id: null,
      refund_request_id: ctx.refundRequestId,
      withdrawal_id: null,
      dispute_id: ctx.disputeId ?? null,
      currency: ctx.currency ?? 'USD',
      gross_amount_usd: ctx.grossAmountUsd,
      platform_fee_usd: ctx.platformFeeUsd ?? 0,
      tax_amount_usd: 0,
      net_amount_usd: ctx.grossAmountUsd,
      payment_provider: null,
      provider_reference: ctx.providerReference ?? null,
      idempotency_key: buildLedgerIdempotencyKey(
        LedgerEntryType.Refund,
        ctx.refundRequestId
      ),
      metadata: { escrow_status: EscrowStatus.Refunded },
    };

    await this.ledgerService.recordLedgerEntry(entry);
    await this.eventService.recordFinanceEvent({
      event_type: FinanceEventType.RefundCompleted,
      actor_id: ctx.actorId ?? null,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId,
      milestone_id: ctx.milestoneId ?? null,
      transaction_id: ctx.transactionId ?? null,
      invoice_id: null,
      refund_request_id: ctx.refundRequestId,
      withdrawal_id: null,
      dispute_id: ctx.disputeId ?? null,
      metadata: { gross_amount_usd: ctx.grossAmountUsd },
    });
  }
}
