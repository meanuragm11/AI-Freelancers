/** Generic bordered card container for finance console panels and table wrappers. */

type FinanceCardProps = {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  loading?: boolean;
};

const PADDING: Record<NonNullable<FinanceCardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

export default function FinanceCard({ children, className = '', padding = 'md', loading = false }: FinanceCardProps) {
  if (loading) {
    return (
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${PADDING[padding]} ${className}`}
        aria-busy="true"
        aria-label="Loading content"
      >
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-1/3 rounded-lg bg-slate-200" />
          <div className="h-24 rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${PADDING[padding]} ${className}`}>
      {children}
    </div>
  );
}
