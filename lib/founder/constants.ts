export const FOUNDER_NAV_ITEMS = [
  { href: '/founder', label: 'Overview', icon: 'grid' },
  { href: '/founder/tickets', label: 'Support Tickets', icon: 'inbox' },
  { href: '/founder/disputes', label: 'Disputes', icon: 'scale' },
  { href: '/founder/payments', label: 'Payments', icon: 'card' },
  { href: '/founder/users', label: 'Users', icon: 'users' },
  { href: '/founder/moderation', label: 'AI Moderation', icon: 'shield' },
] as const;

export const INTERNAL_NOTE_ENTITY_TYPES = ['user', 'dispute', 'support_ticket', 'payment'] as const;
export type InternalNoteEntityType = (typeof INTERNAL_NOTE_ENTITY_TYPES)[number];

export {
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_STYLES,
  DISPUTE_PRIORITY_LABELS,
  DISPUTE_DECISION_LABELS,
  DISPUTE_DECISION_OPTIONS,
  FOUNDER_DISPUTE_STATUS_FILTERS,
  DISPUTE_PRIORITIES,
  DISPUTE_DECISION_TYPES,
} from '@/lib/disputes/constants';
