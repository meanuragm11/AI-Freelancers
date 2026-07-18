export const DISPUTE_STATUSES = [
  'open',
  'under_investigation',
  'decision_recorded',
  'waiting_for_payment_execution',
  'closed',
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

/** Disputes that still block escrow / project actions */
export const ACTIVE_DISPUTE_STATUSES = [
  'open',
  'under_investigation',
  'decision_recorded',
  'waiting_for_payment_execution',
] as const;

export const FOUNDER_DISPUTE_STATUS_FILTERS = [
  'open',
  'under_investigation',
  'waiting_for_payment_execution',
  'closed',
] as const;

export const DISPUTE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type DisputePriority = (typeof DISPUTE_PRIORITIES)[number];

export const DISPUTE_DECISION_TYPES = [
  'pending',
  'refund_buyer',
  'release_builder',
  'split',
  'cancelled',
] as const;
export type DisputeDecisionType = (typeof DISPUTE_DECISION_TYPES)[number];

export const DISPUTE_PAYMENT_EXECUTION_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'failed',
  'not_required',
] as const;

export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_investigation: 'Under Investigation',
  decision_recorded: 'Decision Recorded',
  waiting_for_payment_execution: 'Waiting For Payment Execution',
  closed: 'Closed',
};

export const DISPUTE_STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-100',
  under_investigation: 'bg-amber-50 text-amber-700 border-amber-100',
  decision_recorded: 'bg-purple-50 text-purple-700 border-purple-100',
  waiting_for_payment_execution: 'bg-orange-50 text-orange-700 border-orange-100',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const DISPUTE_PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const DISPUTE_DECISION_LABELS: Record<string, string> = {
  pending: 'Pending',
  refund_buyer: 'Refund Buyer',
  release_builder: 'Release Builder',
  split: 'Split',
  cancelled: 'Cancelled',
};

export const DISPUTE_DECISION_OPTIONS = [
  { value: 'release_builder', label: 'Release 100% to Builder' },
  { value: 'refund_buyer', label: 'Refund 100% to Buyer' },
  { value: 'split', label: 'Split Escrow' },
  { value: 'cancelled', label: 'Cancel Dispute (No Payment Change)' },
] as const;

export const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function isActiveDisputeStatus(status?: string | null) {
  return (ACTIVE_DISPUTE_STATUSES as readonly string[]).includes((status || '').toLowerCase());
}

export function isClosedDisputeStatus(status?: string | null) {
  return (status || '').toLowerCase() === 'closed';
}

export function founderDisputeDetailPath(disputeId: string) {
  return `/founder/disputes/${disputeId}`;
}

export function founderPaymentsPathForDispute(collabId: string, disputeId: string) {
  return `/founder/payments?tab=escrow&q=${encodeURIComponent(collabId)}&disputeId=${encodeURIComponent(disputeId)}`;
}

/** Map legacy participant/resolution values to decision_type */
export function mapLegacyResolutionType(value?: string | null): DisputeDecisionType | null {
  if (!value) return null;
  const map: Record<string, DisputeDecisionType> = {
    buyer_favor: 'refund_buyer',
    freelancer_favor: 'release_builder',
    split: 'split',
    other: 'cancelled',
  };
  return map[value] ?? null;
}
