'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FinanceError,
  FinanceHeader,
  FinancePage,
  FinancePriorityBadge,
  FinanceSearch,
  FinanceSection,
  FinanceStatCard,
  FinanceTable,
  FinanceStatusBadge,
  type FinanceTableColumn,
} from '@/components/finance';
import { useDebouncedValue } from '@/components/finance/hooks/useDebouncedValue';
import { useFinanceInbox } from '@/components/finance/hooks/useFinanceInbox';
import {
  formatFinanceDate,
  formatUsd,
  resolveUrgentItemHref,
} from '@/components/finance/utils/formatters';
import type { InboxUrgentItem } from '@/lib/finance/console/types';

export default function FinanceInboxPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, loading, error, refresh } = useFinanceInbox(debouncedSearch);

  const columns = useMemo<FinanceTableColumn<InboxUrgentItem>[]>(
    () => [
      {
        key: 'priority',
        header: 'Priority',
        render: (row) => <FinancePriorityBadge priority={row.priority} />,
      },
      {
        key: 'title',
        header: 'Title',
        render: (row) => <span className="font-semibold text-slate-900">{row.title}</span>,
      },
      {
        key: 'subtitle',
        header: 'Reason',
        render: (row) => <span className="text-slate-600">{row.subtitle}</span>,
      },
      {
        key: 'createdAt',
        header: 'Created',
        hideOnMobile: true,
        render: (row) => (
          <span className="text-slate-500 whitespace-nowrap">{formatFinanceDate(row.createdAt)}</span>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (row) => (
          <button
            type="button"
            onClick={() => router.push(resolveUrgentItemHref(row))}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Open
          </button>
        ),
      },
    ],
    [router],
  );

  const showInitialError = Boolean(error && !data);

  return (
    <FinancePage>
      <FinanceHeader
        title="Inbox"
        description="Triage urgent finance queue items — payouts, refunds, disputes, and health alerts."
        actions={
          <div className="w-full sm:w-72">
            <FinanceSearch
              value={search}
              onChange={setSearch}
              placeholder="Search urgent items…"
              loading={loading}
              aria-label="Search finance inbox"
            />
          </div>
        }
      />

      {showInitialError ? (
        <FinanceError message={error!} onRetry={() => void refresh()} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FinanceStatCard
              label="Escrow Balance"
              value={data ? formatUsd(data.escrowBalance) : '—'}
              hint="Held in escrow"
              accent="blue"
              loading={loading && !data}
            />
            <FinanceStatCard
              label="Pending Payout Amount"
              value={data ? formatUsd(data.pendingMoney) : '—'}
              hint="Payouts and refunds awaiting action"
              accent="amber"
              loading={loading && !data}
            />
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Finance Health
              </p>
              {loading && !data ? (
                <div className="animate-pulse space-y-2" aria-busy="true">
                  <div className="h-7 w-24 rounded bg-slate-200" />
                  <div className="h-2 w-32 rounded bg-slate-100" />
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <FinanceStatusBadge
                      status={data?.financeHealth ?? 'unknown'}
                      label={data?.financeHealth ?? 'Unknown'}
                    />
                  </div>
                  <p className="text-xs font-medium text-slate-400">Overall finance system status</p>
                </>
              )}
            </div>
          </div>

          <FinanceSection
            title="Work Queue"
            description="Items sorted by priority, then recency."
          >
            <FinanceTable
              columns={columns}
              rows={data?.urgentItems ?? []}
              rowKey={(row) => row.id}
              loading={loading}
              error={error}
              onRetry={() => void refresh()}
              emptyTitle="Inbox clear"
              emptyDescription={
                debouncedSearch.trim()
                  ? 'No urgent items match your search.'
                  : 'No urgent finance items need attention right now.'
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
            />
          </FinanceSection>
        </>
      )}
    </FinancePage>
  );
}
