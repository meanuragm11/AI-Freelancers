/** Finance console navigation and display tokens — UI-only, no backend coupling. */

export const FINANCE_NAV_ITEMS = [
  { href: '/founder/finance/inbox', label: 'Inbox', description: 'Review and triage finance queue items' },
  { href: '/founder/finance/payouts', label: 'Payouts', description: 'Monitor builder payout requests' },
  { href: '/founder/finance/cases', label: 'Reviews', description: 'Review refunds, disputes and exceptional finance decisions' },
  { href: '/founder/finance/ledger', label: 'Ledger', description: 'Explore ledger entries and balances' },
  { href: '/founder/finance/settings', label: 'Settings', description: 'Configure finance console preferences' },
] as const;

export type FinanceNavHref = (typeof FINANCE_NAV_ITEMS)[number]['href'];

export const FINANCE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  processing: 'Processing',
  refund: 'Refund',
  dispute: 'Dispute',
  healthy: 'Healthy',
  critical: 'Critical',
};

export const FINANCE_STATUS_TONES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  completed: 'bg-green-50 text-green-700 border-green-100',
  processing: 'bg-blue-50 text-blue-700 border-blue-100',
  refund: 'bg-purple-50 text-purple-700 border-purple-100',
  dispute: 'bg-rose-50 text-rose-700 border-rose-100',
  healthy: 'bg-green-50 text-green-700 border-green-100',
  critical: 'bg-rose-50 text-rose-700 border-rose-100',
};

export const FINANCE_PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const FINANCE_PRIORITY_TONES: Record<string, string> = {
  critical: 'bg-rose-50 text-rose-700 border-rose-100',
  high: 'bg-amber-50 text-amber-700 border-amber-100',
  medium: 'bg-blue-50 text-blue-700 border-blue-100',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};
