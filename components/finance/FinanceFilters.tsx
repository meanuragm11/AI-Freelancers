'use client';

/** Collapsible filter panel for finance list views — controlled select/checkbox filters. */

export type FinanceFilterOption = {
  value: string;
  label: string;
};

export type FinanceFilterField = {
  id: string;
  label: string;
  options: FinanceFilterOption[];
  value: string;
  onChange: (value: string) => void;
};

type FinanceFiltersProps = {
  fields: FinanceFilterField[];
  open: boolean;
  onToggle: () => void;
  onClear?: () => void;
  activeCount?: number;
  className?: string;
};

export default function FinanceFilters({
  fields,
  open,
  onToggle,
  onClear,
  activeCount = 0,
  className = '',
}: FinanceFiltersProps) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="finance-filters-panel"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-black">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="finance-filters-panel"
          role="region"
          aria-label="Finance filters"
          className="mt-3 p-4 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {fields.map((field) => (
            <label key={field.id} htmlFor={`finance-filter-${field.id}`} className="block space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{field.label}</span>
              <select
                id={`finance-filter-${field.id}`}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
              >
                <option value="">All</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          {onClear && activeCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-2 py-1"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
