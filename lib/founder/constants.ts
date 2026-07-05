export const FOUNDER_NAV_ITEMS = [
  { href: '/founder', label: 'Overview', icon: 'grid' },
  { href: '/founder/tickets', label: 'Support Tickets', icon: 'inbox' },
  { href: '/founder/disputes', label: 'Dispute Center', icon: 'scale' },
  { href: '/founder/payments', label: 'Payment Center', icon: 'card' },
  { href: '/founder/users', label: 'Users', icon: 'users' },
  { href: '/founder/fraud', label: 'Fraud & Risk', icon: 'shield' },
  { href: '/founder/system', label: 'System Health', icon: 'pulse' },
  { href: '/founder/search', label: 'Global Search', icon: 'search' },
  { href: '/founder/audit', label: 'Audit Log', icon: 'clock' },
] as const;

export const INTERNAL_NOTE_ENTITY_TYPES = ['user', 'dispute', 'support_ticket', 'payment'] as const;
export type InternalNoteEntityType = (typeof INTERNAL_NOTE_ENTITY_TYPES)[number];

export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  waiting_for_freelancer: 'Waiting for Freelancer',
  waiting_for_buyer: 'Waiting for Buyer',
  negotiation: 'Negotiation',
  under_review: 'Under Review',
  arbitration_requested: 'Arbitration Requested',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const DISPUTE_STATUS_STYLES: Record<string, string> = {
  waiting_for_freelancer: 'bg-amber-50 text-amber-700 border-amber-100',
  waiting_for_buyer: 'bg-amber-50 text-amber-700 border-amber-100',
  negotiation: 'bg-purple-50 text-purple-700 border-purple-100',
  under_review: 'bg-blue-50 text-blue-700 border-blue-100',
  arbitration_requested: 'bg-rose-50 text-rose-700 border-rose-100',
  resolved: 'bg-green-50 text-green-700 border-green-100',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};
