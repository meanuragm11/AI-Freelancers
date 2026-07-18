export const FOUNDER_TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
  'closed',
] as const;

export type FounderTicketStatus = (typeof FOUNDER_TICKET_STATUSES)[number];

export const FOUNDER_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_user: 'Waiting for Customer',
  arbitration_requested: 'Arbitration Requested',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const FOUNDER_TICKET_CATEGORIES = [
  'Payment',
  'Refund',
  'Escrow',
  'Technical',
  'Account',
  'Verification',
  'Other',
] as const;

export type FounderTicketCategory = (typeof FOUNDER_TICKET_CATEGORIES)[number];

export const FOUNDER_CATEGORY_DB_VALUES: Record<FounderTicketCategory, string[]> = {
  Payment: ['Payment', 'Withdrawal', 'Service Purchase', 'AI Solution'],
  Refund: ['Refund Request', 'Disputes'],
  Escrow: ['Escrow', 'Custom Project'],
  Technical: ['Bug Report', 'Feature Request', 'Technical Error', 'Messaging'],
  Account: ['Account & Login', 'Security Concern'],
  Verification: ['Profile Verification'],
  Other: ['Other'],
};

export const FOUNDER_TICKET_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export type FounderTicketPriority = (typeof FOUNDER_TICKET_PRIORITIES)[number];

export const FOUNDER_PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const FOUNDER_ACTIVE_STATUSES = [
  'open',
  'in_progress',
  'waiting_for_user',
  'arbitration_requested',
] as const;

export const FOUNDER_RESOLVED_STATUSES = ['resolved', 'closed'] as const;

export function founderStatusLabel(status: string): string {
  return FOUNDER_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export function founderPriorityLabel(priority: string): string {
  return FOUNDER_PRIORITY_LABELS[priority] || priority;
}

export function resolveFounderUserRole(profile: {
  is_freelancer?: boolean | null;
  role?: string | null;
}): 'Buyer' | 'Builder' | 'Both' {
  const isBuilder = Boolean(profile.is_freelancer);
  const role = profile.role?.toLowerCase() ?? '';
  const isBuyer = role.includes('buyer') || !isBuilder;

  if (isBuilder && isBuyer) return 'Both';
  if (isBuilder) return 'Builder';
  return 'Buyer';
}

export function founderTicketDetailPath(ticketId: string) {
  return `/founder/tickets/${ticketId}`;
}
