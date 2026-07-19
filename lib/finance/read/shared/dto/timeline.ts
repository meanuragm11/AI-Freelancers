/**
 * Normalized timeline item for cross-entity finance activity feed.
 */

export type TimelineEntityType =
  | 'event'
  | 'ledger'
  | 'payout'
  | 'refund'
  | 'dispute'
  | 'withdrawal';

export interface TimelineItemDto {
  id: string;
  entityType: TimelineEntityType;
  eventType: string;
  status: string | null;
  title: string;
  description: string | null;
  amountUsd: number | null;
  currency: string;
  buyerId: string | null;
  builderId: string | null;
  collabId: string | null;
  invoiceId: string | null;
  transactionId: string | null;
  occurredAt: string;
  metadata: Record<string, unknown>;
}
