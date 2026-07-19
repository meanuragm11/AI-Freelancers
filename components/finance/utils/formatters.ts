import { formatUsd } from '@/lib/finance/utils/money';

export { formatUsd };

export function formatFinanceDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatWaitingSince(iso: string | null | undefined): string {
  if (!iso) return '—';

  const created = new Date(iso);
  const diffMs = Date.now() - created.getTime();
  if (diffMs < 0) return 'Just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;

  return created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function payoutSourceLabel(source: string): string {
  switch (source) {
    case 'withdrawal':
      return 'Withdrawal';
    case 'invoice':
      return 'Invoice';
    case 'finance_v2':
      return 'Finance V2';
    default:
      return source.replace(/_/g, ' ');
  }
}

export function paymentMethodLabel(source: string): string {
  switch (source) {
    case 'withdrawal':
      return 'Bank withdrawal';
    case 'invoice':
      return 'Invoice payout';
    case 'finance_v2':
      return 'Finance engine';
    default:
      return '—';
  }
}

export function healthAccent(status: string): 'green' | 'amber' | 'rose' | 'default' {
  const normalized = status.toLowerCase();
  if (normalized === 'healthy' || normalized === 'ok') return 'green';
  if (normalized === 'degraded' || normalized === 'warning') return 'amber';
  if (normalized === 'critical' || normalized === 'unhealthy') return 'rose';
  return 'default';
}

export function caseTypeLabel(type: 'refund' | 'dispute'): string {
  return type === 'refund' ? 'Refund' : 'Dispute';
}

export function formatAssignedTo(value: string | null | undefined): string {
  if (!value?.trim()) return 'Not assigned';
  return value;
}

export function formatNotAvailable(value: string | null | undefined): string {
  if (!value?.trim()) return 'Not available';
  return value;
}

export function resolveUrgentItemHref(item: { type: string; actionUrl: string }): string {
  switch (item.type) {
    case 'payout':
      return '/founder/finance/payouts';
    case 'refund':
      return '/founder/finance/cases?type=refunds';
    case 'dispute':
      return '/founder/finance/cases?type=disputes';
    default:
      return item.actionUrl || '/founder/finance/inbox';
  }
}
