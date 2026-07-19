/**
 * Row-to-DTO mappers for Finance Read Layer.
 * Keeps DB shapes internal — services return DTOs only.
 */

import type { FinanceEvent } from '../../types/events';
import type { FinanceLedgerEntry } from '../../types/ledger';
import type { FinancePayout } from '../../types/payouts';
import { roundMoney } from '../../utils/money';
import type { DisputeQueueItemDto, DisputeQueueStatusFilter } from './dto/disputes';
import type { LedgerEntryDto } from './dto/ledger';
import type { PayoutQueueItemDto, PayoutQueueSource } from './dto/payouts';
import type { RefundQueueItemDto, RefundQueueStatusFilter } from './dto/refunds';
import type { TimelineItemDto, TimelineEntityType } from './dto/timeline';

export function mapLedgerEntryToDto(row: FinanceLedgerEntry): LedgerEntryDto {
  return {
    id: row.id,
    entryType: row.entry_type,
    direction: row.direction,
    accountType: row.account_type,
    grossAmountUsd: roundMoney(row.gross_amount_usd),
    platformFeeUsd: roundMoney(row.platform_fee_usd),
    taxAmountUsd: roundMoney(row.tax_amount_usd),
    netAmountUsd: roundMoney(row.net_amount_usd),
    currency: row.currency,
    buyerId: row.buyer_id,
    builderId: row.builder_id,
    collabId: row.collab_id,
    milestoneId: row.milestone_id,
    transactionId: row.transaction_id,
    invoiceId: row.invoice_id,
    refundRequestId: row.refund_request_id,
    withdrawalId: row.withdrawal_id,
    disputeId: row.dispute_id,
    paymentProvider: row.payment_provider,
    providerReference: row.provider_reference,
    createdAt: row.created_at,
  };
}

export function mapFinanceEventToTimelineItem(row: FinanceEvent): TimelineItemDto {
  return {
    id: row.id,
    entityType: 'event',
    eventType: row.event_type,
    status: null,
    title: formatEventTitle(row.event_type),
    description: null,
    amountUsd: extractAmountFromMetadata(row.metadata),
    currency: 'USD',
    buyerId: row.buyer_id,
    builderId: row.builder_id,
    collabId: row.collab_id,
    invoiceId: row.invoice_id,
    transactionId: row.transaction_id,
    occurredAt: row.created_at,
    metadata: row.metadata ?? {},
  };
}

export function mapLedgerToTimelineItem(row: FinanceLedgerEntry): TimelineItemDto {
  return {
    id: row.id,
    entityType: 'ledger',
    eventType: row.entry_type,
    status: row.direction,
    title: `Ledger: ${row.entry_type}`,
    description: `${row.direction} · ${row.account_type}`,
    amountUsd: roundMoney(row.net_amount_usd),
    currency: row.currency,
    buyerId: row.buyer_id,
    builderId: row.builder_id,
    collabId: row.collab_id,
    invoiceId: row.invoice_id,
    transactionId: row.transaction_id,
    occurredAt: row.created_at,
    metadata: row.metadata ?? {},
  };
}

export function mapFinancePayoutToDto(
  row: FinancePayout,
  builderName: string | null = null
): PayoutQueueItemDto {
  return {
    id: row.id,
    source: 'finance_v2',
    builderId: row.builder_id,
    builderName,
    grossAmountUsd: roundMoney(row.gross_amount),
    netAmountUsd: roundMoney(row.net_amount),
    platformFeeUsd: roundMoney(row.platform_fee),
    currency: row.currency,
    status: row.status,
    invoiceId: row.invoice_id,
    withdrawalReference: row.reference,
    requiresFounderAction: row.status === 'pending' || row.status === 'processing',
    createdAt: row.created_at,
    processedAt: row.processed_at,
  };
}

export function mapWithdrawalToPayoutDto(row: {
  id: string;
  builder_id: string;
  amount_usd: number;
  status: string;
  reference_code: string;
  created_at: string;
  completed_at: string | null;
  builder?: { full_name: string | null } | { full_name: string | null }[] | null;
}): PayoutQueueItemDto {
  const builder = normalizeJoin(row.builder);
  return {
    id: row.id,
    source: 'withdrawal',
    builderId: row.builder_id,
    builderName: builder?.full_name ?? null,
    grossAmountUsd: roundMoney(Number(row.amount_usd)),
    netAmountUsd: roundMoney(Number(row.amount_usd)),
    platformFeeUsd: 0,
    currency: 'USD',
    status: row.status,
    invoiceId: null,
    withdrawalReference: row.reference_code,
    requiresFounderAction: row.status === 'processing',
    createdAt: row.created_at,
    processedAt: row.completed_at,
  };
}

export function mapInvoiceToPayoutDto(row: {
  id: string;
  builder_id: string;
  gross_amount_usd: number;
  net_payout_usd: number;
  status: string;
  created_at: string;
  builder?: { full_name: string | null } | { full_name: string | null }[] | null;
}): PayoutQueueItemDto {
  const builder = normalizeJoin(row.builder);
  const gross = roundMoney(Number(row.gross_amount_usd));
  const net = roundMoney(Number(row.net_payout_usd));
  return {
    id: row.id,
    source: 'invoice',
    builderId: row.builder_id,
    builderName: builder?.full_name ?? null,
    grossAmountUsd: gross,
    netAmountUsd: net,
    platformFeeUsd: roundMoney(Math.max(0, gross - net)),
    currency: 'USD',
    status: row.status,
    invoiceId: row.id,
    withdrawalReference: null,
    requiresFounderAction: row.status === 'processing',
    createdAt: row.created_at,
    processedAt: null,
  };
}

export function mapRefundRequestToDto(row: {
  id: string;
  buyer_id: string;
  builder_id: string;
  collab_id: string;
  transaction_id: string;
  requested_amount_usd: number;
  status: string;
  refund_type: string;
  reason: string;
  founder_decision_amount_usd: number | null;
  created_at: string;
  updated_at: string;
}): RefundQueueItemDto {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    builderId: row.builder_id,
    collabId: row.collab_id,
    transactionId: row.transaction_id,
    requestedAmountUsd: roundMoney(Number(row.requested_amount_usd)),
    status: row.status,
    queueStatus: mapRefundStatusToQueueFilter(row.status),
    refundType: row.refund_type,
    reason: row.reason,
    founderDecisionAmountUsd:
      row.founder_decision_amount_usd != null
        ? roundMoney(Number(row.founder_decision_amount_usd))
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDisputeToDto(
  row: {
    id: string;
    collab_id: string;
    buyer_id: string;
    freelancer_id: string;
    status: string;
    primary_reason: string;
    escrow_frozen_at: string;
    created_at: string;
    resolved_at: string | null;
    escrow_snapshot?: Record<string, unknown> | null;
  },
  collabEscrowUsd: number | null = null
): DisputeQueueItemDto {
  const snapshotAmount = row.escrow_snapshot?.amount_usd ?? row.escrow_snapshot?.escrow_amount_usd;
  const amountAtStake =
    collabEscrowUsd ??
    (snapshotAmount != null ? roundMoney(Number(snapshotAmount)) : null);

  return {
    id: row.id,
    collabId: row.collab_id,
    buyerId: row.buyer_id,
    builderId: row.freelancer_id,
    status: row.status,
    queueStatus: mapDisputeStatusToQueueFilter(row.status),
    primaryReason: row.primary_reason,
    amountAtStakeUsd: amountAtStake,
    escrowFrozenAt: row.escrow_frozen_at,
    openedAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export function mapRefundStatusToQueueFilter(status: string): RefundQueueStatusFilter {
  switch (status) {
    case 'requested':
      return 'waiting_builder';
    case 'builder_responded':
      return 'waiting_founder';
    case 'founder_review':
    case 'approved':
    case 'processing':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
}

export function mapDisputeStatusToQueueFilter(status: string): DisputeQueueStatusFilter {
  switch (status) {
    case 'waiting_for_buyer':
      return 'waiting_buyer';
    case 'waiting_for_freelancer':
      return 'waiting_builder';
    case 'under_review':
    case 'arbitration_requested':
      return 'waiting_founder';
    case 'negotiation':
      return 'settlement_pending';
    case 'resolved':
    case 'closed':
      return 'closed';
    default:
      return 'settlement_pending';
  }
}

export function mapRefundQueueFilterToDbStatuses(
  filter: RefundQueueStatusFilter
): string[] {
  switch (filter) {
    case 'waiting_builder':
      return ['requested'];
    case 'waiting_founder':
      return ['builder_responded'];
    case 'pending':
      return ['founder_review', 'approved', 'processing'];
    case 'approved':
      return ['approved'];
    case 'rejected':
      return ['rejected'];
    case 'completed':
      return ['completed'];
    default:
      return [];
  }
}

export function mapDisputeQueueFilterToDbStatuses(
  filter: DisputeQueueStatusFilter
): string[] {
  switch (filter) {
    case 'waiting_buyer':
      return ['waiting_for_buyer'];
    case 'waiting_builder':
      return ['waiting_for_freelancer'];
    case 'waiting_founder':
      return ['under_review', 'arbitration_requested'];
    case 'settlement_pending':
      return ['negotiation'];
    case 'closed':
      return ['resolved', 'closed'];
    default:
      return [];
  }
}

export function createTimelineItemFromRefund(row: {
  id: string;
  buyer_id: string;
  builder_id: string;
  collab_id: string;
  transaction_id: string;
  requested_amount_usd: number;
  status: string;
  reason: string;
  created_at: string;
}): TimelineItemDto {
  return {
    id: row.id,
    entityType: 'refund',
    eventType: 'refund_requested',
    status: row.status,
    title: 'Refund request',
    description: row.reason,
    amountUsd: roundMoney(Number(row.requested_amount_usd)),
    currency: 'USD',
    buyerId: row.buyer_id,
    builderId: row.builder_id,
    collabId: row.collab_id,
    invoiceId: null,
    transactionId: row.transaction_id,
    occurredAt: row.created_at,
    metadata: {},
  };
}

export function createTimelineItemFromDispute(row: {
  id: string;
  buyer_id: string;
  freelancer_id: string;
  collab_id: string;
  status: string;
  primary_reason: string;
  created_at: string;
}): TimelineItemDto {
  return {
    id: row.id,
    entityType: 'dispute',
    eventType: 'dispute_opened',
    status: row.status,
    title: 'Dispute opened',
    description: row.primary_reason,
    amountUsd: null,
    currency: 'USD',
    buyerId: row.buyer_id,
    builderId: row.freelancer_id,
    collabId: row.collab_id,
    invoiceId: null,
    transactionId: null,
    occurredAt: row.created_at,
    metadata: {},
  };
}

export function createTimelineItemFromWithdrawal(row: {
  id: string;
  builder_id: string;
  amount_usd: number;
  status: string;
  reference_code: string;
  created_at: string;
}): TimelineItemDto {
  return {
    id: row.id,
    entityType: 'withdrawal',
    eventType: 'withdrawal_requested',
    status: row.status,
    title: 'Builder withdrawal',
    description: row.reference_code,
    amountUsd: roundMoney(Number(row.amount_usd)),
    currency: 'USD',
    buyerId: null,
    builderId: row.builder_id,
    collabId: null,
    invoiceId: null,
    transactionId: null,
    occurredAt: row.created_at,
    metadata: { referenceCode: row.reference_code },
  };
}

export function createTimelineItemFromPayout(
  row: FinancePayout,
  entityType: TimelineEntityType = 'payout'
): TimelineItemDto {
  return {
    id: row.id,
    entityType,
    eventType: 'payout_created',
    status: row.status,
    title: 'Payout',
    description: row.notes,
    amountUsd: roundMoney(row.net_amount),
    currency: row.currency,
    buyerId: null,
    builderId: row.builder_id,
    collabId: null,
    invoiceId: row.invoice_id,
    transactionId: null,
    occurredAt: row.created_at,
    metadata: { reference: row.reference },
  };
}

function formatEventTitle(eventType: string): string {
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractAmountFromMetadata(metadata: Record<string, unknown>): number | null {
  const keys = ['amount_usd', 'net_amount_usd', 'gross_amount_usd', 'amountUsd'];
  for (const key of keys) {
    const value = metadata[key];
    if (value != null && Number.isFinite(Number(value))) {
      return roundMoney(Number(value));
    }
  }
  return null;
}

function normalizeJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function sumColumn(rows: Array<Record<string, unknown>>, column: string): number {
  return roundMoney(
    rows.reduce((sum, row) => {
      const value = Number(row[column] ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0)
  );
}

export function applyDateRange<T extends { gte: (col: string, val: string) => T; lte: (col: string, val: string) => T }>(
  query: T,
  column: string,
  from?: string,
  to?: string
): T {
  let next = query;
  if (from) next = next.gte(column, from);
  if (to) next = next.lte(column, to);
  return next;
}

export function matchesTimelineFilters(
  item: TimelineItemDto,
  filters: {
    entity?: string;
    builderId?: string;
    buyerId?: string;
    invoiceId?: string;
    collabId?: string;
    eventType?: string;
    status?: string;
    from?: string;
    to?: string;
  }
): boolean {
  if (filters.entity && item.entityType !== filters.entity) return false;
  if (filters.builderId && item.builderId !== filters.builderId) return false;
  if (filters.buyerId && item.buyerId !== filters.buyerId) return false;
  if (filters.invoiceId && item.invoiceId !== filters.invoiceId) return false;
  if (filters.collabId && item.collabId !== filters.collabId) return false;
  if (filters.eventType && item.eventType !== filters.eventType) return false;
  if (filters.status && item.status !== filters.status) return false;
  if (filters.from && item.occurredAt < filters.from) return false;
  if (filters.to && item.occurredAt > filters.to) return false;
  return true;
}

export function sortTimelineItems(
  items: TimelineItemDto[],
  sort: string,
  direction: 'asc' | 'desc'
): TimelineItemDto[] {
  const sorted = [...items].sort((a, b) => {
    const aVal = sort === 'amountUsd' ? (a.amountUsd ?? 0) : a.occurredAt;
    const bVal = sort === 'amountUsd' ? (b.amountUsd ?? 0) : b.occurredAt;
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

export function payoutSourcePriority(source: PayoutQueueSource): number {
  switch (source) {
    case 'finance_v2':
      return 0;
    case 'invoice':
      return 1;
    case 'withdrawal':
      return 2;
    default:
      return 3;
  }
}
