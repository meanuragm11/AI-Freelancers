'use client';

/** Controlled pagination controls for finance tables and list views. */

type FinancePaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

export default function FinancePagination({
  page,
  totalPages,
  total,
  onPageChange,
  disabled = false,
  className = '',
}: FinancePaginationProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/80 ${className}`}
    >
      <p className="text-xs font-medium text-slate-500">
        Page {page} of {Math.max(totalPages, 1)}
        {typeof total === 'number' && <span className="text-slate-400"> · {total.toLocaleString()} total</span>}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !canPrev}
          aria-label="Previous page"
          className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !canNext}
          aria-label="Next page"
          className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
