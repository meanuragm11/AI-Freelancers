/** Sticky module header with eyebrow, title, description, and optional actions. */

type FinanceHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  sticky?: boolean;
};

export default function FinanceHeader({
  eyebrow = 'Finance',
  title,
  description,
  actions,
  sticky = false,
}: FinanceHeaderProps) {
  return (
    <header
      className={`${sticky ? 'sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-white/95 backdrop-blur border-b border-slate-200' : ''}`}
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1.5">{eyebrow}</p>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm font-medium text-slate-500 mt-1.5 max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
