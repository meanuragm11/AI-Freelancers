type StatCardProps = {
  label: string;
  value: string;
  accent?: 'default' | 'blue' | 'rose' | 'green' | 'amber';
  hint?: string;
};

const ACCENTS: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'text-slate-900',
  blue: 'text-blue-600',
  rose: 'text-rose-600',
  green: 'text-green-600',
  amber: 'text-amber-600',
};

export default function StatCard({ label, value, accent = 'default', hint }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className={`text-2xl md:text-3xl font-black tracking-tight ${ACCENTS[accent]}`}>{value}</p>
      {hint && <p className="text-xs font-medium text-slate-400 mt-2">{hint}</p>}
    </div>
  );
}
