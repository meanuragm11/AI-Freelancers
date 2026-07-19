'use client';

/** Table-first data grid for finance console — sorting, loading, empty, error, sticky header, responsive cards. */

import FinanceEmptyState from './FinanceEmptyState';
import FinanceError from './FinanceError';
import FinanceLoading from './FinanceLoading';
import FinancePagination from './FinancePagination';

export type FinanceSortDirection = 'asc' | 'desc';

export type FinanceTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  mobileLabel?: React.ReactNode;
  hideOnMobile?: boolean;
  headerClassName?: string;
  cellClassName?: string;
};

export type FinanceTableSort = {
  column: string;
  direction: FinanceSortDirection;
};

type FinanceTableProps<T> = {
  columns: FinanceTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: FinanceTableSort;
  onSortChange?: (sort: FinanceTableSort) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  stickyHeader?: boolean;
  renderMobileCard?: (row: T) => React.ReactNode;
  className?: string;
};

function SortIndicator({ active, direction }: { active: boolean; direction: FinanceSortDirection }) {
  return (
    <span className="inline-flex flex-col ml-1 text-slate-300" aria-hidden="true">
      <svg
        className={`w-2.5 h-2.5 -mb-0.5 ${active && direction === 'asc' ? 'text-blue-600' : ''}`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 0l5 6H0z" />
      </svg>
      <svg
        className={`w-2.5 h-2.5 ${active && direction === 'desc' ? 'text-blue-600' : ''}`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 6L0 0h10z" />
      </svg>
    </span>
  );
}

export default function FinanceTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
  emptyAction,
  page,
  totalPages,
  total,
  onPageChange,
  stickyHeader = true,
  renderMobileCard,
  className = '',
}: FinanceTableProps<T>) {
  const handleSort = (column: FinanceTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;

    const isActive = sort?.column === column.key;
    const nextDirection: FinanceSortDirection =
      isActive && sort.direction === 'asc' ? 'desc' : 'asc';

    onSortChange({ column: column.key, direction: nextDirection });
  };

  const showPagination =
    onPageChange !== undefined &&
    page !== undefined &&
    totalPages !== undefined;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {loading && rows.length === 0 ? (
        <FinanceLoading variant="table" />
      ) : error ? (
        <div className="p-6">
          <FinanceError message={error} onRetry={onRetry} />
        </div>
      ) : rows.length === 0 ? (
        <FinanceEmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead
                className={`uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-200 ${
                  stickyHeader ? 'sticky top-0 z-[1]' : ''
                }`}
              >
                <tr>
                  {columns.map((col) => {
                    const isActive = sort?.column === col.key;
                    const sortable = col.sortable && onSortChange;

                    return (
                      <th key={col.key} scope="col" className={`px-4 py-3 ${col.headerClassName ?? ''}`}>
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(col)}
                            className="inline-flex items-center hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                            aria-sort={
                              isActive
                                ? sort.direction === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            {col.header}
                            <SortIndicator active={Boolean(isActive)} direction={sort?.direction ?? 'asc'} />
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
                {rows.map((row) => (
                  <tr key={rowKey(row)} className="hover:bg-slate-50/80 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.cellClassName ?? ''}`}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`md:hidden divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
            {rows.map((row) =>
              renderMobileCard ? (
                <div key={rowKey(row)} className="p-4">
                  {renderMobileCard(row)}
                </div>
              ) : (
                <div key={rowKey(row)} className="p-4 space-y-3">
                  {columns
                    .filter((col) => !col.hideOnMobile)
                    .map((col) => (
                      <div key={col.key} className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {col.mobileLabel ?? col.header}
                        </span>
                        <div className="min-w-0 text-sm">{col.render(row)}</div>
                      </div>
                    ))}
                </div>
              ),
            )}
          </div>
        </>
      )}

      {showPagination && !error && (
        <FinancePagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={onPageChange}
          disabled={loading}
        />
      )}
    </div>
  );
}
