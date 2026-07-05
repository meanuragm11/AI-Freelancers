type BadgeProps = {
  label: string;
  tone?: 'slate' | 'blue' | 'amber' | 'rose' | 'green' | 'purple';
};

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
};

export default function Badge({ label, tone = 'slate' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${TONES[tone]}`}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}
