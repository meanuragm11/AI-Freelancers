export const OPEN_DISPUTE_STATUSES = [
  'waiting_for_freelancer',
  'waiting_for_buyer',
  'negotiation',
  'under_review',
  'arbitration_requested',
] as const;

export const OPEN_TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_for_user',
  'arbitration_requested',
] as const;

export const ACTIVE_ESCROW_COLLAB_STATUSES = ['funded', 'in_progress', 'submitted', 'disputed'] as const;

export const ACTIVE_PROJECT_STATUSES = ['published', 'receiving_proposals', 'negotiating'] as const;

export const PENDING_MODERATION_STATUSES = ['pending', 'flagged'] as const;

export type AttentionPriority = 'critical' | 'high' | 'medium' | 'low';

export const ATTENTION_PRIORITY_RANK: Record<AttentionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function ticketAttentionPriority(status: string, priority: string): AttentionPriority {
  if (status === 'arbitration_requested') return 'critical';
  if (priority === 'high') return 'high';
  if (priority === 'medium') return 'medium';
  return 'low';
}

export function disputeAttentionPriority(status: string): AttentionPriority {
  if (status === 'arbitration_requested') return 'critical';
  if (status === 'under_review') return 'high';
  if (status === 'negotiation' || status.startsWith('waiting_for')) return 'medium';
  return 'low';
}

export function moderationAttentionPriority(status: string, riskScore: number): AttentionPriority {
  if (status === 'blocked' || riskScore >= 80) return 'high';
  if (status === 'flagged') return 'medium';
  return 'medium';
}

export function formatAttentionStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export function businessEventHref(
  entityType: string,
  entityId: string | null,
  collabId: string | null
): string | null {
  if (entityType === 'support_ticket' && entityId) return `/founder/tickets/${entityId}`;
  if (entityType === 'dispute' && entityId) return `/founder/disputes/${entityId}`;
  if (entityType === 'transaction' && entityId) return `/founder/payments?q=${entityId}`;
  if (entityType === 'withdrawal' && entityId) return `/founder/payments?tab=withdrawals&q=${entityId}`;
  if (entityType === 'refund_request' && entityId) return `/founder/payments?tab=refunds&q=${entityId}`;
  if (entityType === 'collab' && (entityId || collabId)) {
    return `/founder/payments?q=${entityId || collabId}`;
  }
  if (entityType === 'profile' && entityId) return `/founder/users/${entityId}`;
  return null;
}
