/**
 * Shadow dual-write integration layer for Finance V2.
 *
 * Production payment/refund/milestone flows remain source of truth.
 * Finance recording is append-only and must never block or throw.
 *
 * Feature flags (lib/finance/constants/featureFlags.ts — all default false):
 * - LEDGER_ENABLED: gates finance_ledger_entries writes
 * - FINANCE_EVENTS_ENABLED: gates finance_events writes
 * - PAYOUT_ENGINE_ENABLED: gates finance_payouts creation
 *
 * Idempotency strategy:
 * - Ledger rows require a deterministic idempotency_key (DB unique constraint).
 *   Prefer buildLedgerIdempotencyKey(entryType, ...domainIds) or operation keys such as
 *   `payment:captured:{razorpay_payment_id}`, `escrow:funded:{milestone_id}`,
 *   `milestone:released:{milestone_id}`.
 * - Finance events have no idempotency column; include `idempotency_key` in metadata for
 *   audit dedupe. Call sites must run only after production success (same ordering as legacy).
 *
 * Error handling:
 * - All public methods catch, log `[FinanceIntegration]`, and return null.
 * - Callers must not await in critical paths unless already after success; failures are logged only.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FINANCE_EVENTS_ENABLED,
  LEDGER_ENABLED,
  PAYOUT_ENGINE_ENABLED,
  SUPPORTED_PAYMENT_PROVIDER,
} from '../constants';
import {
  FinanceAccountType,
  FinanceDirection,
  FinanceEventType,
  LedgerEntryType,
} from '../enums';
import {
  FinanceEventService,
  FinanceLedgerService,
  FinancePayoutService,
} from '../services';
import type { CreatePayoutInput } from '../services/financePayoutService';
import type { EscrowContext } from '../services/escrowFinanceService';
import type { FinanceEvent, FinanceEventInsert } from '../types/events';
import type { FinanceLedgerEntry, FinanceLedgerEntryInsert } from '../types/ledger';
import type { FinancePayout } from '../types/payouts';
import { buildLedgerIdempotencyKey, buildProviderReference } from '../utils';

/** Deterministic non-ledger idempotency key for finance event metadata. */
export function buildFinanceEventIdempotencyKey(
  operation: string,
  ...parts: (string | number | null | undefined)[]
): string {
  const normalized = parts
    .filter((p) => p !== null && p !== undefined && String(p).length > 0)
    .map((p) => String(p).replace(/[^a-zA-Z0-9_-]/g, '_'))
    .join(':');
  return `finance_event:${operation}:${normalized}`;
}

export function buildPaymentCapturedIdempotencyKey(paymentId: string): string {
  return `payment:captured:${paymentId}`;
}

export function buildEscrowFundedIdempotencyKey(milestoneId: string): string {
  return `escrow:funded:${milestoneId}`;
}

export function buildMilestoneReleasedIdempotencyKey(milestoneId: string): string {
  return `milestone:released:${milestoneId}`;
}

export type PaymentCapturedContext = {
  buyerId: string | null;
  builderId: string | null;
  collabId?: string | null;
  milestoneId?: string | null;
  transactionId?: string | null;
  currency?: string;
  grossAmountUsd: number;
  platformFeeUsd?: number;
  paymentId: string;
  actorId?: string | null;
  checkoutType: 'escrow' | 'asset' | 'solution' | 'revision';
};

export class FinanceIntegrationService {
  private readonly ledgerService: FinanceLedgerService;
  private readonly eventService: FinanceEventService;
  private readonly payoutService: FinancePayoutService;

  constructor(client: SupabaseClient) {
    this.ledgerService = new FinanceLedgerService(client);
    this.eventService = new FinanceEventService(client);
    this.payoutService = new FinancePayoutService(client);
  }

  /**
   * Append a ledger entry when LEDGER_ENABLED. Never throws.
   */
  async safelyRecordLedgerEntry(
    entry: FinanceLedgerEntryInsert
  ): Promise<FinanceLedgerEntry | null> {
    try {
      if (!LEDGER_ENABLED) return null;
      return await this.ledgerService.recordLedgerEntry(entry);
    } catch (error) {
      console.error('[FinanceIntegration] safelyRecordLedgerEntry failed', {
        entry_type: entry.entry_type,
        idempotency_key: entry.idempotency_key,
        error,
      });
      return null;
    }
  }

  /**
   * Append a finance audit event when FINANCE_EVENTS_ENABLED. Never throws.
   */
  async safelyRecordFinanceEvent(event: FinanceEventInsert): Promise<FinanceEvent | null> {
    try {
      if (!FINANCE_EVENTS_ENABLED) return null;
      return await this.eventService.recordFinanceEvent(event);
    } catch (error) {
      console.error('[FinanceIntegration] safelyRecordFinanceEvent failed', {
        event_type: event.event_type,
        error,
      });
      return null;
    }
  }

  /**
   * Queue a builder payout when PAYOUT_ENGINE_ENABLED. Never throws.
   */
  async safelyCreatePayout(input: CreatePayoutInput): Promise<FinancePayout | null> {
    try {
      if (!PAYOUT_ENGINE_ENABLED) return null;
      return await this.payoutService.createPayout(input);
    } catch (error) {
      console.error('[FinanceIntegration] safelyCreatePayout failed', {
        builderId: input.builderId,
        error,
      });
      return null;
    }
  }

  /** Dual-write payment capture (ledger + PaymentCaptured event). */
  async recordPaymentCaptured(ctx: PaymentCapturedContext): Promise<void> {
    const platformFee = ctx.platformFeeUsd ?? 0;
    const net = Math.max(0, ctx.grossAmountUsd - platformFee);
    const idempotencyKey = buildPaymentCapturedIdempotencyKey(ctx.paymentId);
    const providerReference = buildProviderReference(SUPPORTED_PAYMENT_PROVIDER, ctx.paymentId);

    const entryType =
      ctx.checkoutType === 'escrow'
        ? LedgerEntryType.EscrowDeposit
        : ctx.checkoutType === 'revision'
          ? LedgerEntryType.Adjustment
          : LedgerEntryType.ComponentSale;

    const accountType =
      ctx.checkoutType === 'escrow'
        ? FinanceAccountType.EscrowHold
        : ctx.checkoutType === 'revision'
          ? FinanceAccountType.PlatformRevenue
          : FinanceAccountType.BuilderWallet;

    await this.safelyRecordLedgerEntry({
      entry_type: entryType,
      direction: FinanceDirection.Credit,
      account_type: accountType,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId ?? null,
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
      payment_provider: SUPPORTED_PAYMENT_PROVIDER,
      provider_reference: providerReference,
      idempotency_key: buildLedgerIdempotencyKey(entryType, idempotencyKey),
      metadata: { checkout_type: ctx.checkoutType, semantic: 'payment_captured' },
    });

    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.PaymentCaptured,
      actor_id: ctx.actorId ?? ctx.buyerId,
      buyer_id: ctx.buyerId,
      builder_id: ctx.builderId,
      collab_id: ctx.collabId ?? null,
      milestone_id: ctx.milestoneId ?? null,
      transaction_id: ctx.transactionId ?? null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: {
        idempotency_key: buildFinanceEventIdempotencyKey('payment_captured', ctx.paymentId),
        checkout_type: ctx.checkoutType,
        gross_amount_usd: ctx.grossAmountUsd,
        platform_fee_usd: platformFee,
        net_amount_usd: net,
        currency: ctx.currency ?? 'USD',
        provider: SUPPORTED_PAYMENT_PROVIDER,
        provider_reference: providerReference,
      },
    });
  }

  /** Dual-write escrow funding via EscrowFinanceService (ledger + EscrowFunded). */
  async recordEscrowFunded(ctx: EscrowContext): Promise<void> {
    try {
      if (!LEDGER_ENABLED && !FINANCE_EVENTS_ENABLED) return;

      const platformFee = ctx.platformFeeUsd ?? 0;
      const net = Math.max(0, ctx.grossAmountUsd - platformFee);
      const milestoneKey = ctx.milestoneId ?? ctx.transactionId ?? 'unknown';
      const idempotencyKey = buildEscrowFundedIdempotencyKey(String(milestoneKey));

      if (LEDGER_ENABLED) {
        await this.safelyRecordLedgerEntry({
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
          payment_provider: SUPPORTED_PAYMENT_PROVIDER,
          provider_reference: ctx.providerReference ?? null,
          idempotency_key: buildLedgerIdempotencyKey(LedgerEntryType.EscrowDeposit, idempotencyKey),
          metadata: { semantic: 'escrow_funded' },
        });
      }

      await this.safelyRecordFinanceEvent({
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
        metadata: {
          idempotency_key: buildFinanceEventIdempotencyKey('escrow_funded', milestoneKey),
          gross_amount_usd: ctx.grossAmountUsd,
        },
      });
    } catch (error) {
      console.error('[FinanceIntegration] recordEscrowFunded failed', { error });
    }
  }

  /** Milestone approved — event only (no payout). No dedicated enum; metadata carries semantic. */
  async recordMilestoneApproved(params: {
    buyerId: string | null;
    builderId: string | null;
    collabId: string;
    milestoneId: string;
    transactionId?: string | null;
    amountUsd: number;
    actorId: string;
  }): Promise<void> {
    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.EscrowReleased,
      actor_id: params.actorId,
      buyer_id: params.buyerId,
      builder_id: params.builderId,
      collab_id: params.collabId,
      milestone_id: params.milestoneId,
      transaction_id: params.transactionId ?? null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: {
        semantic_event: 'milestone_approved',
        idempotency_key: buildFinanceEventIdempotencyKey(
          'milestone_approved',
          params.milestoneId
        ),
        amount_usd: params.amountUsd,
      },
    });
  }

  /** Invoice created — no INVOICE_CREATED enum; metadata on PayoutCreated as closest anchor. */
  async recordInvoiceCreated(params: {
    buyerId: string | null;
    builderId: string | null;
    collabId: string;
    milestoneId: string;
    invoiceId: string;
    invoiceNumber: string;
    grossAmountUsd: number;
    platformFeeUsd: number;
    actorId: string;
  }): Promise<void> {
    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.PayoutCreated,
      actor_id: params.actorId,
      buyer_id: params.buyerId,
      builder_id: params.builderId,
      collab_id: params.collabId,
      milestone_id: params.milestoneId,
      transaction_id: null,
      invoice_id: params.invoiceId,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: null,
      metadata: {
        semantic_event: 'invoice_created',
        idempotency_key: buildFinanceEventIdempotencyKey('invoice_created', params.invoiceId),
        invoice_number: params.invoiceNumber,
        gross_amount_usd: params.grossAmountUsd,
        platform_fee_usd: params.platformFeeUsd,
      },
    });
  }

  /** Escrow / milestone release — ledger + EscrowReleased event. */
  async recordEscrowReleased(ctx: EscrowContext): Promise<void> {
    try {
      const platformFee = ctx.platformFeeUsd ?? 0;
      const net = Math.max(0, ctx.grossAmountUsd - platformFee);
      const releaseKey = buildMilestoneReleasedIdempotencyKey(String(ctx.milestoneId ?? ctx.collabId));

      await this.safelyRecordLedgerEntry({
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
        idempotency_key: buildLedgerIdempotencyKey(LedgerEntryType.EscrowRelease, releaseKey),
        metadata: { semantic: 'escrow_released' },
      });

      await this.safelyRecordFinanceEvent({
        event_type: FinanceEventType.EscrowReleased,
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
        metadata: {
          idempotency_key: buildFinanceEventIdempotencyKey('escrow_released', releaseKey),
          net_amount_usd: net,
        },
      });
    } catch (error) {
      console.error('[FinanceIntegration] recordEscrowReleased failed', { error });
    }
  }

  /** Refund requested — finance event only. */
  async recordRefundRequested(params: {
    refundRequestId: string;
    buyerId: string;
    builderId: string;
    collabId: string;
    transactionId: string;
    disputeId?: string | null;
    amountUsd: number;
    actorId: string;
  }): Promise<void> {
    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.RefundRequested,
      actor_id: params.actorId,
      buyer_id: params.buyerId,
      builder_id: params.builderId,
      collab_id: params.collabId,
      milestone_id: null,
      transaction_id: params.transactionId,
      invoice_id: null,
      refund_request_id: params.refundRequestId,
      withdrawal_id: null,
      dispute_id: params.disputeId ?? null,
      metadata: {
        idempotency_key: buildFinanceEventIdempotencyKey(
          'refund_requested',
          params.refundRequestId
        ),
        requested_amount_usd: params.amountUsd,
      },
    });
  }

  /** Refund completed — ledger + event via EscrowFinanceService pattern. */
  async recordRefundCompleted(
    ctx: EscrowContext & { refundRequestId: string; disputeId?: string | null }
  ): Promise<void> {
    try {
      const platformFee = ctx.platformFeeUsd ?? 0;

      await this.safelyRecordLedgerEntry({
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
        platform_fee_usd: platformFee,
        tax_amount_usd: 0,
        net_amount_usd: ctx.grossAmountUsd,
        payment_provider: SUPPORTED_PAYMENT_PROVIDER,
        provider_reference: ctx.providerReference ?? null,
        idempotency_key: buildLedgerIdempotencyKey(LedgerEntryType.Refund, ctx.refundRequestId),
        metadata: { semantic: 'refund_completed' },
      });

      await this.safelyRecordFinanceEvent({
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
        metadata: {
          idempotency_key: buildFinanceEventIdempotencyKey(
            'refund_completed',
            ctx.refundRequestId
          ),
          gross_amount_usd: ctx.grossAmountUsd,
        },
      });
    } catch (error) {
      console.error('[FinanceIntegration] recordRefundCompleted failed', { error });
    }
  }

  async recordWithdrawalRequested(params: {
    withdrawalId: string;
    builderId: string;
    amountUsd: number;
    referenceCode?: string | null;
    actorId: string;
  }): Promise<void> {
    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.WithdrawalRequested,
      actor_id: params.actorId,
      buyer_id: null,
      builder_id: params.builderId,
      collab_id: null,
      milestone_id: null,
      transaction_id: null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: params.withdrawalId,
      dispute_id: null,
      metadata: {
        idempotency_key: buildFinanceEventIdempotencyKey(
          'withdrawal_requested',
          params.withdrawalId
        ),
        amount_usd: params.amountUsd,
        reference_code: params.referenceCode ?? null,
      },
    });
  }

  async recordWithdrawalCompleted(params: {
    withdrawalId: string;
    builderId: string;
    amountUsd: number;
    referenceCode?: string | null;
    processedBy: string;
  }): Promise<void> {
    await this.safelyRecordLedgerEntry({
      entry_type: LedgerEntryType.Withdrawal,
      direction: FinanceDirection.Debit,
      account_type: FinanceAccountType.BuilderWallet,
      buyer_id: null,
      builder_id: params.builderId,
      collab_id: null,
      milestone_id: null,
      transaction_id: null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: params.withdrawalId,
      dispute_id: null,
      currency: 'USD',
      gross_amount_usd: params.amountUsd,
      platform_fee_usd: 0,
      tax_amount_usd: 0,
      net_amount_usd: params.amountUsd,
      payment_provider: SUPPORTED_PAYMENT_PROVIDER,
      provider_reference: params.referenceCode ?? null,
      idempotency_key: buildLedgerIdempotencyKey(
        LedgerEntryType.Withdrawal,
        params.withdrawalId
      ),
      metadata: { semantic: 'withdrawal_completed' },
    });

    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.PayoutCompleted,
      actor_id: params.processedBy,
      buyer_id: null,
      builder_id: params.builderId,
      collab_id: null,
      milestone_id: null,
      transaction_id: null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: params.withdrawalId,
      dispute_id: null,
      metadata: {
        idempotency_key: buildFinanceEventIdempotencyKey(
          'withdrawal_completed',
          params.withdrawalId
        ),
        amount_usd: params.amountUsd,
        reference_code: params.referenceCode ?? null,
      },
    });
  }

  async recordDisputeOpened(params: {
    disputeId: string;
    collabId: string;
    buyerId: string;
    builderId: string;
    actorId: string;
    escrowAmountUsd?: number | null;
  }): Promise<void> {
    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.DisputeOpened,
      actor_id: params.actorId,
      buyer_id: params.buyerId,
      builder_id: params.builderId,
      collab_id: params.collabId,
      milestone_id: null,
      transaction_id: null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: params.disputeId,
      metadata: {
        idempotency_key: buildFinanceEventIdempotencyKey('dispute_opened', params.disputeId),
        escrow_amount_usd: params.escrowAmountUsd ?? null,
      },
    });

    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.EscrowFrozen,
      actor_id: params.actorId,
      buyer_id: params.buyerId,
      builder_id: params.builderId,
      collab_id: params.collabId,
      milestone_id: null,
      transaction_id: null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: params.disputeId,
      metadata: {
        idempotency_key: buildFinanceEventIdempotencyKey('escrow_frozen', params.disputeId),
      },
    });
  }

  async recordDisputeSettled(params: {
    disputeId: string;
    collabId: string;
    buyerId: string;
    builderId: string;
    actorId?: string | null;
    settlementAmountUsd?: number | null;
    decisionType?: string | null;
  }): Promise<void> {
    const amount = params.settlementAmountUsd ?? 0;

    if (amount > 0) {
      await this.safelyRecordLedgerEntry({
        entry_type: LedgerEntryType.DisputeSettlement,
        direction: FinanceDirection.Credit,
        account_type: FinanceAccountType.EscrowHold,
        buyer_id: params.buyerId,
        builder_id: params.builderId,
        collab_id: params.collabId,
        milestone_id: null,
        transaction_id: null,
        invoice_id: null,
        refund_request_id: null,
        withdrawal_id: null,
        dispute_id: params.disputeId,
        currency: 'USD',
        gross_amount_usd: amount,
        platform_fee_usd: 0,
        tax_amount_usd: 0,
        net_amount_usd: amount,
        payment_provider: null,
        provider_reference: null,
        idempotency_key: buildLedgerIdempotencyKey(
          LedgerEntryType.DisputeSettlement,
          params.disputeId
        ),
        metadata: { decision_type: params.decisionType ?? null },
      });
    }

    await this.safelyRecordFinanceEvent({
      event_type: FinanceEventType.DisputeSettled,
      actor_id: params.actorId ?? null,
      buyer_id: params.buyerId,
      builder_id: params.builderId,
      collab_id: params.collabId,
      milestone_id: null,
      transaction_id: null,
      invoice_id: null,
      refund_request_id: null,
      withdrawal_id: null,
      dispute_id: params.disputeId,
      metadata: {
        idempotency_key: buildFinanceEventIdempotencyKey('dispute_settled', params.disputeId),
        settlement_amount_usd: amount,
        decision_type: params.decisionType ?? null,
      },
    });
  }
}

export function createFinanceIntegrationService(
  client: SupabaseClient
): FinanceIntegrationService {
  return new FinanceIntegrationService(client);
}
