/** Compact metric card for finance overview rows — table-first, no charts. */

type FinanceStatCardProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: 'default' | 'blue' | 'green' | 'amber' | 'rose';
  loading?: boolean;
};

const ACCENTS: Record<NonNullable<FinanceStatCardProps['accent']>, string> = {
  default: 'text-slate-900',
  blue: 'text-blue-600',
  green: 'text-green-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
};

export default function FinanceStatCard({
  label,
  value,
  hint,
  accent = 'default',
  loading = false,
}: FinanceStatCardProps) {
  if (loading) {
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-pulse" aria-busy="true">
        <div className="h-2.5 w-20 rounded bg-slate-200 mb-3" />
        <div className="h-7 w-28 rounded bg-slate-200 mb-2" />
        <div className="h-2 w-32 rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${ACCENTS[accent]}`}>{value}</p>
      {hint && <p className="text-xs font-medium text-slate-400 mt-2">{hint}</p>}
    </div>
  );
}
