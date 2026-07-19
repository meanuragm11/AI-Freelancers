/** Priority badge for finance queue items — critical, high, medium, low. */

import { FINANCE_PRIORITY_LABELS, FINANCE_PRIORITY_TONES } from './constants';

export type FinancePriority = 'critical' | 'high' | 'medium' | 'low' | (string & {});

type FinancePriorityBadgeProps = {
  priority: FinancePriority;
  label?: string;
  className?: string;
};

export default function FinancePriorityBadge({ priority, label, className = '' }: FinancePriorityBadgeProps) {
  const normalized = priority.toLowerCase();
  const tone = FINANCE_PRIORITY_TONES[normalized] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const text = label ?? FINANCE_PRIORITY_LABELS[normalized] ?? priority.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${tone} ${className}`}
    >
      {text}
    </span>
  );
}
