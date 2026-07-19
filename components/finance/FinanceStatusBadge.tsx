/** Status badge for finance queue items — pending, completed, processing, refund, dispute, healthy, critical. */

import { FINANCE_STATUS_LABELS, FINANCE_STATUS_TONES } from './constants';

export type FinanceStatus =
  | 'pending'
  | 'completed'
  | 'processing'
  | 'refund'
  | 'dispute'
  | 'healthy'
  | 'critical'
  | (string & {});

type FinanceStatusBadgeProps = {
  status: FinanceStatus;
  label?: string;
  className?: string;
};

export default function FinanceStatusBadge({ status, label, className = '' }: FinanceStatusBadgeProps) {
  const normalized = status.toLowerCase();
  const tone = FINANCE_STATUS_TONES[normalized] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const text = label ?? FINANCE_STATUS_LABELS[normalized] ?? status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${tone} ${className}`}
    >
      {text}
    </span>
  );
}
