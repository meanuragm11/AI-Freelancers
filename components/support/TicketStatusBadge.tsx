import type { SupportStatus } from '@/lib/support/constants';
import { SUPPORT_STATUS_LABELS } from '@/lib/support/constants';

const STATUS_STYLES: Record<SupportStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-100',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-100',
  waiting_for_user: 'bg-purple-50 text-purple-700 border-purple-100',
  arbitration_requested: 'bg-rose-50 text-rose-700 border-rose-100',
  resolved: 'bg-green-50 text-green-700 border-green-100',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function TicketStatusBadge({ status }: { status: string }) {
  const normalized = (status in SUPPORT_STATUS_LABELS
    ? status
    : 'open') as SupportStatus;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[normalized]}`}
    >
      {SUPPORT_STATUS_LABELS[normalized]}
    </span>
  );
}
