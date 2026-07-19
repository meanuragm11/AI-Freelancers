/**
 * Refund queue item DTO — unified view of refund_requests and finance events.
 */

export type RefundQueueStatusFilter =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'waiting_builder'
  | 'waiting_founder';

export interface RefundQueueItemDto {
  id: string;
  buyerId: string;
  builderId: string;
  collabId: string;
  transactionId: string;
  requestedAmountUsd: number;
  status: string;
  queueStatus: RefundQueueStatusFilter;
  refundType: string;
  reason: string;
  founderDecisionAmountUsd: number | null;
  createdAt: string;
  updatedAt: string;
}
