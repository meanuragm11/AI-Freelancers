'use client';

/** Toolbar row combining search, filters toggle, refresh, and right-side action slots. */

import FinanceSearch from './FinanceSearch';
import FinanceFilters, { type FinanceFilterField } from './FinanceFilters';

type FinanceToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  filters?: FinanceFilterField[];
  filtersOpen?: boolean;
  onFiltersToggle?: () => void;
  onFiltersClear?: () => void;
  activeFilterCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  rightActions?: React.ReactNode;
  className?: string;
};

export default function FinanceToolbar({
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  filters,
  filtersOpen = false,
  onFiltersToggle,
  onFiltersClear,
  activeFilterCount = 0,
  onRefresh,
  refreshing = false,
  rightActions,
  className = '',
}: FinanceToolbarProps) {
  const showSearch = onSearchChange !== undefined;
  const showFilters = filters && onFiltersToggle;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          {showSearch && (
            <FinanceSearch
              value={searchValue}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              placeholder={searchPlaceholder}
              loading={refreshing}
            />
          )}

          {showFilters && (
            <FinanceFilters
              fields={filters}
              open={filtersOpen}
              onToggle={onFiltersToggle}
              onClear={onFiltersClear}
              activeCount={activeFilterCount}
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          )}
          {rightActions}
        </div>
      </div>
    </div>
  );
}
