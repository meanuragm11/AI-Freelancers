/**
 * Dispute queue item DTO — production disputes mapped to founder queue filters.
 */

export type DisputeQueueStatusFilter =
  | 'waiting_buyer'
  | 'waiting_builder'
  | 'waiting_founder'
  | 'settlement_pending'
  | 'closed';

export interface DisputeQueueItemDto {
  id: string;
  collabId: string;
  buyerId: string;
  builderId: string;
  status: string;
  queueStatus: DisputeQueueStatusFilter;
  primaryReason: string;
  amountAtStakeUsd: number | null;
  escrowFrozenAt: string;
  openedAt: string;
  resolvedAt: string | null;
}
