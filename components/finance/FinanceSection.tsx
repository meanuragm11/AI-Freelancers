/** Section block with optional title, description, and trailing action slot. */

type FinanceSectionProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function FinanceSection({
  title,
  description,
  action,
  children,
  className = '',
}: FinanceSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">{title}</h2>}
            {description && <p className="text-xs font-medium text-slate-500 mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
