'use client';

import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FinanceDrawer,
  FinanceHeader,
  FinanceLoading,
  FinancePage,
  FinancePriorityBadge,
  FinanceSection,
  FinanceStatusBadge,
  FinanceTable,
  FinanceToolbar,
  type FinanceFilterField,
  type FinanceTableColumn,
} from '@/components/finance';
import { useDebouncedValue } from '@/components/finance/hooks/useDebouncedValue';
import {
  type CasesTypeTab,
  useFinanceCases,
} from '@/components/finance/hooks/useFinanceCases';
import {
  caseTypeLabel,
  formatAssignedTo,
  formatFinanceDate,
  formatNotAvailable,
  formatUsd,
} from '@/components/finance/utils/formatters';
import type { ConsolePriority, FinanceCaseItem } from '@/lib/finance/console/types';

const PAGE_SIZE = 50;

const TYPE_TABS: { id: CasesTypeTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'disputes', label: 'Disputes' },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'waiting_founder', label: 'Waiting founder' },
  { value: 'waiting_builder', label: 'Waiting builder' },
  { value: 'waiting_buyer', label: 'Waiting buyer' },
  { value: 'pending', label: 'Pending' },
  { value: 'settlement_pending', label: 'Settlement pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

function parseInitialType(value: string | null): CasesTypeTab {
  if (value === 'refunds' || value === 'disputes') return value;
  return 'all';
}

function CaseTypeIcon({ type }: { type: FinanceCaseItem['type'] }) {
  if (type === 'refund') {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-100"
        aria-hidden="true"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 text-rose-700 border border-rose-100"
      aria-hidden="true"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </span>
  );
}

function DrawerField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-900 break-words">{value}</div>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}

export default function FinanceReviewsPage() {
  return (
    <Suspense fallback={<FinanceLoading variant="page" />}>
      <FinanceReviewsPageContent />
    </Suspense>
  );
}

function FinanceReviewsPageContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [typeTab, setTypeTab] = useState<CasesTypeTab>(() =>
    parseInitialType(searchParams.get('type')),
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ConsolePriority | ''>('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<FinanceCaseItem | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      type: typeTab,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      search: debouncedSearch,
      sort: 'openedAt',
      direction: 'desc' as const,
    }),
    [page, typeTab, statusFilter, priorityFilter, debouncedSearch],
  );

  const { data, loading, error, refresh } = useFinanceCases(query);

  const activeFilterCount = [statusFilter, priorityFilter].filter(Boolean).length;

  const filterFields = useMemo<FinanceFilterField[]>(
    () => [
      {
        id: 'status',
        label: 'Status',
        options: STATUS_FILTER_OPTIONS,
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setPage(1);
        },
      },
      {
        id: 'priority',
        label: 'Priority',
        options: PRIORITY_FILTER_OPTIONS,
        value: priorityFilter,
        onChange: (value) => {
          setPriorityFilter(value as ConsolePriority | '');
          setPage(1);
        },
      },
    ],
    [statusFilter, priorityFilter],
  );

  const columns = useMemo<FinanceTableColumn<FinanceCaseItem>[]>(
    () => [
      {
        key: 'type',
        header: 'Type',
        render: (row) => (
          <div className="flex items-center gap-2">
            <CaseTypeIcon type={row.type} />
            <span className="font-semibold text-slate-900">{caseTypeLabel(row.type)}</span>
          </div>
        ),
      },
      {
        key: 'project',
        header: 'Project',
        hideOnMobile: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">
              {row.project.title ?? 'Untitled project'}
            </p>
            <p className="text-xs text-slate-400 truncate">{row.project.id}</p>
          </div>
        ),
      },
      {
        key: 'buyer',
        header: 'Buyer',
        render: (row) => (
          <span className="text-slate-700">{row.buyer.name ?? row.buyer.id.slice(0, 8)}</span>
        ),
      },
      {
        key: 'builder',
        header: 'Builder',
        hideOnMobile: true,
        render: (row) => (
          <span className="text-slate-700">{row.builder.name ?? row.builder.id.slice(0, 8)}</span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        render: (row) => <span className="font-semibold text-slate-900">{formatUsd(row.amount)}</span>,
      },
      {
        key: 'openedAt',
        header: 'Opened',
        hideOnMobile: true,
        render: (row) => (
          <span className="text-slate-500 whitespace-nowrap">{formatFinanceDate(row.openedAt)}</span>
        ),
      },
      {
        key: 'priority',
        header: 'Priority',
        render: (row) => <FinancePriorityBadge priority={row.priority} />,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <FinanceStatusBadge status={row.status} />,
      },
      {
        key: 'action',
        header: 'Action',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (row) => (
          <button
            type="button"
            onClick={() => setSelectedCase(row)}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Review
          </button>
        ),
      },
    ],
    [],
  );

  const handleTypeTabChange = (tab: CasesTypeTab) => {
    setTypeTab(tab);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  const renderMobileCard = (row: FinanceCaseItem) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CaseTypeIcon type={row.type} />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">
              {row.project.title ?? 'Untitled project'}
            </p>
            <p className="text-xs text-slate-500">{caseTypeLabel(row.type)}</p>
          </div>
        </div>
        <FinancePriorityBadge priority={row.priority} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Amount</p>
          <p className="font-semibold text-slate-900">{formatUsd(row.amount)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
          <FinanceStatusBadge status={row.status} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setSelectedCase(row)}
        className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Review
      </button>
    </div>
  );

  return (
    <FinancePage>
      <FinanceHeader
        title="Reviews"
        description="Review refunds, disputes and exceptional finance decisions."
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Review type">
        {TYPE_TABS.map((tab) => {
          const active = typeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleTypeTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <FinanceToolbar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search reviews…"
        filters={filterFields}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((open) => !open)}
        onFiltersClear={handleClearFilters}
        activeFilterCount={activeFilterCount}
        onRefresh={() => void refresh()}
        refreshing={loading}
      />

      <FinanceSection>
        <FinanceTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(row) => `${row.type}:${row.id}`}
          loading={loading}
          error={error}
          onRetry={() => void refresh()}
          emptyTitle="No reviews require your attention."
          emptyDescription={
            debouncedSearch.trim() || statusFilter || priorityFilter || typeTab !== 'all'
              ? 'Try another type tab or adjust your filters.'
              : 'Refund and dispute cases will appear here when they need founder review.'
          }
          emptyAction={
            debouncedSearch.trim() ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
              >
                Clear search
              </button>
            ) : undefined
          }
          page={data?.meta.page ?? page}
          totalPages={data?.meta.totalPages ?? 0}
          total={data?.meta.total}
          onPageChange={setPage}
          renderMobileCard={renderMobileCard}
        />
      </FinanceSection>

      <FinanceDrawer
        open={Boolean(selectedCase)}
        onClose={() => setSelectedCase(null)}
        title="Review details"
        description={
          selectedCase
            ? `${caseTypeLabel(selectedCase.type)} · ${selectedCase.status.replace(/_/g, ' ')}`
            : undefined
        }
        size="lg"
      >
        {selectedCase && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DrawerField
                label="Project"
                value={selectedCase.project.title ?? selectedCase.project.id}
              />
              <DrawerField
                label="Buyer"
                value={selectedCase.buyer.name ?? selectedCase.buyer.id}
              />
              <DrawerField
                label="Builder"
                value={selectedCase.builder.name ?? selectedCase.builder.id}
              />
              <DrawerField label="Amount" value={formatUsd(selectedCase.amount)} />
              <DrawerField label="Reason" value={formatNotAvailable(null)} />
              <DrawerField
                label="Status"
                value={<FinanceStatusBadge status={selectedCase.status} />}
              />
              <DrawerField
                label="Priority"
                value={<FinancePriorityBadge priority={selectedCase.priority} />}
              />
              <DrawerField label="Opened" value={formatFinanceDate(selectedCase.openedAt)} />
              <DrawerField label="Assigned to" value={formatAssignedTo(selectedCase.assignedTo)} />
            </div>

            <DrawerSection title="Timeline">
              <p className="text-slate-500">Not available</p>
            </DrawerSection>

            <DrawerSection title="Evidence">
              <p className="text-slate-500">Not available</p>
            </DrawerSection>

            <DrawerSection title="Conversation summary">
              <p className="text-slate-500">Not available</p>
            </DrawerSection>

            <DrawerSection title="Resolution">
              <p className="text-slate-500">Not available</p>
            </DrawerSection>

            <div className="rounded-xl border border-dashed border-slate-200 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Reference
              </p>
              <p className="text-xs font-mono text-slate-600 break-all">{selectedCase.id}</p>
              <p className="text-xs text-slate-400 break-all">{selectedCase.actionUrl}</p>
            </div>
          </div>
        )}
      </FinanceDrawer>
    </FinancePage>
  );
}
