/** Skeleton loading states for finance pages and table regions — no spinners. */

type FinanceLoadingProps = {
  variant?: 'page' | 'table' | 'inline';
  rows?: number;
  className?: string;
};

export default function FinanceLoading({ variant = 'page', rows = 5, className = '' }: FinanceLoadingProps) {
  if (variant === 'inline') {
    return (
      <div className={`animate-pulse space-y-2 ${className}`} role="status" aria-label="Loading">
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`animate-pulse ${className}`} role="status" aria-label="Loading table">
        <div className="h-10 bg-slate-100 border-b border-slate-200" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-slate-100">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-4 flex-1 rounded bg-slate-100" />
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-pulse ${className}`} role="status" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-2.5 w-16 rounded bg-blue-100" />
        <div className="h-7 w-48 rounded bg-slate-200" />
        <div className="h-3 w-72 rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white border border-slate-200" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-white border border-slate-200" />
    </div>
  );
}
