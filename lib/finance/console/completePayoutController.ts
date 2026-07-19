/**

 * Founder payout completion orchestration.

 *

 * Feature flags:

 * - FINANCE_DASHBOARD_ENABLED: gates the HTTP route (404 when false).

 * - PAYOUT_ENGINE_ENABLED: NOT required for founder completion — status updates

 *   always run when the dashboard is enabled (MVP manual payout recording).

 * - FINANCE_EVENTS_ENABLED / LEDGER_ENABLED: services no-op when false; payout

 *   status update still succeeds.

 */



import type { SupabaseClient } from '@supabase/supabase-js';

import {

  FinanceAccountType,

  FinanceDirection,

  FinanceEventType,

  LedgerEntryType,

  PayoutStatus,

} from '../enums';

import { PRODUCTION_TABLES } from '../read/shared/productionTables';

import type { PayoutQueueItemDto, PayoutQueueSource } from '../read/shared/dto/payouts';

import {

  mapFinancePayoutToDto,

  mapInvoiceToPayoutDto,

  mapWithdrawalToPayoutDto,

} from '../read/shared/mappers';

import { FinanceEventService, FinanceLedgerService, FinancePayoutService } from '../services';

import { buildFinanceEventIdempotencyKey } from '../integration/FinanceIntegrationService';

import { SUPPORTED_PAYMENT_PROVIDER } from '../constants';

import { buildLedgerIdempotencyKey } from '../utils';

import { FinanceValidationError } from '../validators';

import { nowIso } from '../utils/dates';



export type CompletePayoutInput = {

  payoutId: string;

  source: PayoutQueueSource;

  transactionReference: string;

  notes?: string | null;

  receiptUrl?: string | null;

  completedBy: string;

};



export type CompletedPayoutDto = PayoutQueueItemDto & {

  transactionReference: string;

  completedBy: string;

  completedByName: string | null;

  notes: string | null;

  receiptUrl: string | null;

};



const COMPLETABLE_FINANCE_STATUSES = new Set<string>([

  PayoutStatus.Pending,

  PayoutStatus.Processing,

]);



const COMPLETABLE_WITHDRAWAL_STATUSES = new Set<string>(['processing', 'approved']);



const COMPLETABLE_INVOICE_STATUSES = new Set<string>(['processing']);



function buildStoredNotes(notes?: string | null, receiptUrl?: string | null): string | null {

  const parts: string[] = [];

  if (notes?.trim()) parts.push(notes.trim());

  if (receiptUrl?.trim()) parts.push(`Receipt: ${receiptUrl.trim()}`);

  return parts.length > 0 ? parts.join('\n') : null;

}



function parseReceiptUrlFromNotes(notes: string | null): string | null {

  if (!notes) return null;

  const match = /^Receipt:\s*(.+)$/m.exec(notes);

  return match?.[1]?.trim() ?? null;

}



function stripReceiptFromNotes(notes: string | null): string | null {

  if (!notes) return null;

  const cleaned = notes

    .split('\n')

    .filter((line) => !line.startsWith('Receipt:'))

    .join('\n')

    .trim();

  return cleaned.length > 0 ? cleaned : null;

}



function assertNotCompleted(status: string, entity: string): void {

  const normalized = status.toLowerCase();

  if (normalized === PayoutStatus.Completed || normalized === 'paid') {

    throw new FinanceValidationError(`${entity} is already completed`, 'status');

  }

}



async function fetchCompleterName(

  client: SupabaseClient,

  userId: string

): Promise<string | null> {

  const { data } = await client

    .from(PRODUCTION_TABLES.profiles)

    .select('full_name')

    .eq('id', userId)

    .maybeSingle();

  return (data?.full_name as string | null) ?? null;

}



async function completeFinanceV2Payout(

  client: SupabaseClient,

  input: CompletePayoutInput

): Promise<CompletedPayoutDto> {

  const payoutService = new FinancePayoutService(client);

  const eventService = new FinanceEventService(client);

  const ledgerService = new FinanceLedgerService(client);



  const updated = await payoutService.founderCompletePayout(input.payoutId, {

    transactionReference: input.transactionReference,

    processedBy: input.completedBy,

    notes: buildStoredNotes(input.notes, input.receiptUrl),

  });



  await eventService.recordFinanceEvent({

    event_type: FinanceEventType.PayoutCompleted,

    actor_id: input.completedBy,

    buyer_id: null,

    builder_id: updated.builder_id,

    collab_id: null,

    milestone_id: null,

    transaction_id: null,

    invoice_id: updated.invoice_id,

    refund_request_id: null,

    withdrawal_id: null,

    dispute_id: null,

    metadata: {

      idempotency_key: buildFinanceEventIdempotencyKey('payout_completed', updated.id),

      payout_id: updated.id,

      reference: input.transactionReference,

      receipt_url: input.receiptUrl ?? null,

      notes: input.notes ?? null,

    },

  });



  await ledgerService.recordLedgerEntry({

    entry_type: LedgerEntryType.Payout,

    direction: FinanceDirection.Debit,

    account_type: FinanceAccountType.BuilderWallet,

    buyer_id: null,

    builder_id: updated.builder_id,

    collab_id: null,

    milestone_id: null,

    transaction_id: null,

    invoice_id: updated.invoice_id,

    refund_request_id: null,

    withdrawal_id: null,

    dispute_id: null,

    currency: updated.currency,

    gross_amount_usd: updated.gross_amount,

    platform_fee_usd: updated.platform_fee,

    tax_amount_usd: 0,

    net_amount_usd: updated.net_amount,

    payment_provider: SUPPORTED_PAYMENT_PROVIDER,

    provider_reference: input.transactionReference,

    idempotency_key: buildLedgerIdempotencyKey(LedgerEntryType.Payout, updated.id),

    metadata: {

      semantic: 'payout_completed',

      payout_id: updated.id,

      receipt_url: input.receiptUrl ?? null,

    },

  });



  const { data: builderProfile } = await client
    .from(PRODUCTION_TABLES.profiles)
    .select('full_name')
    .eq('id', updated.builder_id)
    .maybeSingle();
  const builderName = (builderProfile?.full_name as string | null) ?? null;

  const dto = mapFinancePayoutToDto(updated, builderName);



  return {

    ...dto,

    transactionReference: input.transactionReference,

    completedBy: input.completedBy,

    completedByName: await fetchCompleterName(client, input.completedBy),

    notes: input.notes?.trim() ?? null,

    receiptUrl: input.receiptUrl?.trim() ?? null,

  };

}



async function completeWithdrawalPayout(

  client: SupabaseClient,

  input: CompletePayoutInput

): Promise<CompletedPayoutDto> {

  const eventService = new FinanceEventService(client);

  const ledgerService = new FinanceLedgerService(client);



  const { data: existing, error: fetchError } = await client

    .from(PRODUCTION_TABLES.builderWithdrawals)

    .select(

      'id, builder_id, amount_usd, status, reference_code, created_at, completed_at, builder:builder_id(full_name)'

    )

    .eq('id', input.payoutId)

    .maybeSingle();



  if (fetchError) throw fetchError;

  if (!existing) {

    throw new FinanceValidationError('Payout not found', 'id');

  }



  assertNotCompleted(existing.status, 'Withdrawal');



  if (!COMPLETABLE_WITHDRAWAL_STATUSES.has(existing.status)) {

    throw new FinanceValidationError(

      `Withdrawal cannot be completed from status "${existing.status}"`,

      'status'

    );

  }



  const now = nowIso();

  const { data: updated, error: updateError } = await client

    .from(PRODUCTION_TABLES.builderWithdrawals)

    .update({

      status: 'completed',

      completed_at: now,

    })

    .eq('id', input.payoutId)

    .select(

      'id, builder_id, amount_usd, status, reference_code, created_at, completed_at, builder:builder_id(full_name)'

    )

    .single();



  if (updateError) throw updateError;



  await eventService.recordFinanceEvent({

    event_type: FinanceEventType.PayoutCompleted,

    actor_id: input.completedBy,

    buyer_id: null,

    builder_id: existing.builder_id,

    collab_id: null,

    milestone_id: null,

    transaction_id: null,

    invoice_id: null,

    refund_request_id: null,

    withdrawal_id: existing.id,

    dispute_id: null,

    metadata: {

      idempotency_key: buildFinanceEventIdempotencyKey('payout_completed', existing.id),

      withdrawal_id: existing.id,

      reference: input.transactionReference,

      receipt_url: input.receiptUrl ?? null,

      notes: input.notes ?? null,

    },

  });



  await ledgerService.recordLedgerEntry({

    entry_type: LedgerEntryType.Withdrawal,

    direction: FinanceDirection.Debit,

    account_type: FinanceAccountType.BuilderWallet,

    buyer_id: null,

    builder_id: existing.builder_id,

    collab_id: null,

    milestone_id: null,

    transaction_id: null,

    invoice_id: null,

    refund_request_id: null,

    withdrawal_id: existing.id,

    dispute_id: null,

    currency: 'USD',

    gross_amount_usd: Number(existing.amount_usd),

    platform_fee_usd: 0,

    tax_amount_usd: 0,

    net_amount_usd: Number(existing.amount_usd),

    payment_provider: SUPPORTED_PAYMENT_PROVIDER,

    provider_reference: input.transactionReference,

    idempotency_key: buildLedgerIdempotencyKey(LedgerEntryType.Withdrawal, existing.id),

    metadata: {

      semantic: 'withdrawal_completed',

      receipt_url: input.receiptUrl ?? null,

      notes: input.notes ?? null,

    },

  });



  const dto = mapWithdrawalToPayoutDto(updated);



  return {

    ...dto,

    transactionReference: input.transactionReference,

    completedBy: input.completedBy,

    completedByName: await fetchCompleterName(client, input.completedBy),

    notes: input.notes?.trim() ?? null,

    receiptUrl: input.receiptUrl?.trim() ?? null,

  };

}



async function completeInvoicePayout(

  client: SupabaseClient,

  input: CompletePayoutInput

): Promise<CompletedPayoutDto> {

  const eventService = new FinanceEventService(client);

  const ledgerService = new FinanceLedgerService(client);



  const { data: existing, error: fetchError } = await client

    .from(PRODUCTION_TABLES.invoices)

    .select(

      'id, builder_id, gross_amount_usd, net_payout_usd, status, created_at, builder:builder_id(full_name)'

    )

    .eq('id', input.payoutId)

    .maybeSingle();



  if (fetchError) throw fetchError;

  if (!existing) {

    throw new FinanceValidationError('Payout not found', 'id');

  }



  assertNotCompleted(existing.status, 'Invoice payout');



  if (!COMPLETABLE_INVOICE_STATUSES.has(existing.status)) {

    throw new FinanceValidationError(

      `Invoice payout cannot be completed from status "${existing.status}"`,

      'status'

    );

  }



  const { data: updated, error: updateError } = await client

    .from(PRODUCTION_TABLES.invoices)

    .update({ status: 'paid' })

    .eq('id', input.payoutId)

    .select(

      'id, builder_id, gross_amount_usd, net_payout_usd, status, created_at, builder:builder_id(full_name)'

    )

    .single();



  if (updateError) throw updateError;



  const gross = Number(existing.gross_amount_usd);

  const net = Number(existing.net_payout_usd);

  const platformFee = Math.max(0, gross - net);



  await eventService.recordFinanceEvent({

    event_type: FinanceEventType.PayoutCompleted,

    actor_id: input.completedBy,

    buyer_id: null,

    builder_id: existing.builder_id,

    collab_id: null,

    milestone_id: null,

    transaction_id: null,

    invoice_id: existing.id,

    refund_request_id: null,

    withdrawal_id: null,

    dispute_id: null,

    metadata: {

      idempotency_key: buildFinanceEventIdempotencyKey('payout_completed', existing.id),

      invoice_id: existing.id,

      reference: input.transactionReference,

      receipt_url: input.receiptUrl ?? null,

      notes: input.notes ?? null,

    },

  });



  await ledgerService.recordLedgerEntry({

    entry_type: LedgerEntryType.Payout,

    direction: FinanceDirection.Debit,

    account_type: FinanceAccountType.BuilderWallet,

    buyer_id: null,

    builder_id: existing.builder_id,

    collab_id: null,

    milestone_id: null,

    transaction_id: null,

    invoice_id: existing.id,

    refund_request_id: null,

    withdrawal_id: null,

    dispute_id: null,

    currency: 'USD',

    gross_amount_usd: gross,

    platform_fee_usd: platformFee,

    tax_amount_usd: 0,

    net_amount_usd: net,

    payment_provider: SUPPORTED_PAYMENT_PROVIDER,

    provider_reference: input.transactionReference,

    idempotency_key: buildLedgerIdempotencyKey(LedgerEntryType.Payout, `invoice:${existing.id}`),

    metadata: {

      semantic: 'invoice_payout_completed',

      receipt_url: input.receiptUrl ?? null,

    },

  });



  const dto = mapInvoiceToPayoutDto(updated);



  return {

    ...dto,

    processedAt: nowIso(),

    transactionReference: input.transactionReference,

    completedBy: input.completedBy,

    completedByName: await fetchCompleterName(client, input.completedBy),

    notes: input.notes?.trim() ?? null,

    receiptUrl: input.receiptUrl?.trim() ?? null,

  };

}



export async function completeFinancePayout(

  client: SupabaseClient,

  input: CompletePayoutInput

): Promise<CompletedPayoutDto> {

  const reference = input.transactionReference?.trim();

  if (!reference) {

    throw new FinanceValidationError('transactionReference is required', 'transactionReference');

  }



  switch (input.source) {

    case 'finance_v2':

      return completeFinanceV2Payout(client, { ...input, transactionReference: reference });

    case 'withdrawal':

      return completeWithdrawalPayout(client, { ...input, transactionReference: reference });

    case 'invoice':

      return completeInvoicePayout(client, { ...input, transactionReference: reference });

    default:

      throw new FinanceValidationError('Invalid payout source', 'source');

  }

}



export function isAlreadyCompletedError(error: unknown): boolean {

  return (

    error instanceof FinanceValidationError &&

    error.field === 'status' &&

    /already completed/i.test(error.message)

  );

}



export { parseReceiptUrlFromNotes, stripReceiptFromNotes, COMPLETABLE_FINANCE_STATUSES };


