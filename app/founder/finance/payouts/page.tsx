'use client';



import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {

  FinanceDrawer,

  FinanceHeader,

  FinancePage,

  FinanceSection,

  FinanceStatusBadge,

  FinanceTable,

  FinanceToolbar,

  type FinanceFilterField,

  type FinanceTableColumn,

} from '@/components/finance';

import PayoutRecordStepper, { PayoutCompletionAudit } from '@/components/finance/PayoutRecordStepper';

import { useDebouncedValue } from '@/components/finance/hooks/useDebouncedValue';

import {

  isPayoutCompletable,

  useCompletePayout,

} from '@/components/finance/hooks/useCompletePayout';

import {

  type FinancePayoutsQuery,

  type PayoutStatusTab,

  useFinancePayouts,

} from '@/components/finance/hooks/useFinancePayouts';

import {

  formatFinanceDate,

  formatUsd,

  formatWaitingSince,

  paymentMethodLabel,

  payoutSourceLabel,

} from '@/components/finance/utils/formatters';

import type { CompletedPayoutDto } from '@/lib/finance/console/completePayoutController';

import type { PayoutQueueItemDto } from '@/lib/finance/read/shared/dto/payouts';



const PAGE_SIZE = 50;



const STATUS_TABS: { id: PayoutStatusTab; label: string }[] = [

  { id: 'pending', label: 'Pending' },

  { id: 'processing', label: 'Processing' },

  { id: 'completed', label: 'Completed' },

];



const STATUS_FILTER_OPTIONS = [

  { value: 'pending', label: 'Pending' },

  { value: 'processing', label: 'Processing' },

  { value: 'completed', label: 'Completed' },

];



const COUNTRY_FILTER_OPTIONS = [

  { value: 'US', label: 'United States' },

  { value: 'IN', label: 'India' },

  { value: 'GB', label: 'United Kingdom' },

  { value: 'CA', label: 'Canada' },

  { value: 'AU', label: 'Australia' },

];



const CURRENCY_FILTER_OPTIONS = [{ value: 'USD', label: 'USD' }];



type SelectedPayout = PayoutQueueItemDto & {

  transactionReference?: string | null;

  completedBy?: string | null;

  completedByName?: string | null;

  notes?: string | null;

  receiptUrl?: string | null;

};



function invoiceLabel(item: PayoutQueueItemDto): string {

  if (item.invoiceId) return item.invoiceId.slice(0, 8);

  if (item.withdrawalReference) return item.withdrawalReference;

  return '—';

}



function DrawerField({ label, value }: { label: string; value: ReactNode }) {

  return (

    <div className="space-y-1">

      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>

      <div className="text-sm font-medium text-slate-900 break-words">{value}</div>

    </div>

  );

}



function FinanceToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {

  useEffect(() => {

    const timer = window.setTimeout(onDismiss, 4000);

    return () => window.clearTimeout(timer);

  }, [onDismiss]);



  return (

    <div

      role="status"

      aria-live="polite"

      className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg"

    >

      <p className="text-sm font-semibold text-emerald-900">{message}</p>

    </div>

  );

}



export default function FinancePayoutsPage() {

  const [search, setSearch] = useState('');

  const [statusTab, setStatusTab] = useState<PayoutStatusTab>('pending');

  const [statusFilter, setStatusFilter] = useState('');

  const [country, setCountry] = useState('');

  const [currency, setCurrency] = useState('');

  const [page, setPage] = useState(1);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedPayout, setSelectedPayout] = useState<SelectedPayout | null>(null);

  const [recordMode, setRecordMode] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);



  const debouncedSearch = useDebouncedValue(search, 300);

  const activeStatus = (statusFilter || statusTab) as PayoutStatusTab;

  const { complete, loading: completing, error: completeError, resetError } = useCompletePayout();



  const query = useMemo<FinancePayoutsQuery>(

    () => ({

      page,

      pageSize: PAGE_SIZE,

      country: country || undefined,

      currency: currency || undefined,

      status: activeStatus,

      search: debouncedSearch,

      sort: 'created_at',

      direction: 'desc',

    }),

    [page, country, currency, activeStatus, debouncedSearch],

  );



  const { data, loading, error, refresh } = useFinancePayouts(query);



  const activeFilterCount = [country, currency, statusFilter].filter(Boolean).length;



  const handleCloseDrawer = useCallback(() => {

    setSelectedPayout(null);

    setRecordMode(false);

    resetError();

  }, [resetError]);



  const handleRecordSuccess = useCallback(

    async (completed: CompletedPayoutDto) => {

      setSelectedPayout(completed);

      setRecordMode(false);

      setToastMessage('Payout recorded successfully.');

      await refresh();

    },

    [refresh],

  );



  const handleSubmitRecord = useCallback(

    async (values: { transactionReference: string; notes: string; receiptUrl: string }) => {

      if (!selectedPayout) return;



      const completed = await complete({

        payoutId: selectedPayout.id,

        source: selectedPayout.source,

        transactionReference: values.transactionReference,

        notes: values.notes,

        receiptUrl: values.receiptUrl,

      });



      await handleRecordSuccess(completed);

    },

    [complete, handleRecordSuccess, selectedPayout],

  );



  const filterFields = useMemo<FinanceFilterField[]>(

    () => [

      {

        id: 'status',

        label: 'Status',

        options: STATUS_FILTER_OPTIONS,

        value: statusFilter,

        onChange: (value) => {

          setStatusFilter(value);

          if (value === 'pending' || value === 'processing' || value === 'completed') {

            setStatusTab(value);

          }

          setPage(1);

        },

      },

      {

        id: 'country',

        label: 'Country',

        options: COUNTRY_FILTER_OPTIONS,

        value: country,

        onChange: (value) => {

          setCountry(value);

          setPage(1);

        },

      },

      {

        id: 'currency',

        label: 'Currency',

        options: CURRENCY_FILTER_OPTIONS,

        value: currency,

        onChange: (value) => {

          setCurrency(value);

          setPage(1);

        },

      },

    ],

    [statusFilter, country, currency],

  );



  const columns = useMemo<FinanceTableColumn<PayoutQueueItemDto>[]>(

    () => [

      {

        key: 'builder',

        header: 'Builder',

        render: (row) => (

          <div className="min-w-0">

            <p className="font-semibold text-slate-900 truncate">{row.builderName ?? 'Unknown builder'}</p>

            <p className="text-xs text-slate-400 truncate">{row.builderId}</p>

          </div>

        ),

      },

      {

        key: 'project',

        header: 'Project',

        hideOnMobile: true,

        render: (row) => (

          <span className="text-slate-600">{payoutSourceLabel(row.source)}</span>

        ),

      },

      {

        key: 'invoice',

        header: 'Invoice',

        render: (row) => <span className="font-mono text-xs text-slate-600">{invoiceLabel(row)}</span>,

      },

      {

        key: 'gross',

        header: 'Gross',

        render: (row) => <span className="font-semibold text-slate-900">{formatUsd(row.grossAmountUsd)}</span>,

      },

      {

        key: 'fee',

        header: 'Fee',

        hideOnMobile: true,

        render: (row) => <span className="text-slate-600">{formatUsd(row.platformFeeUsd)}</span>,

      },

      {

        key: 'net',

        header: 'Net',

        render: (row) => <span className="font-semibold text-blue-600">{formatUsd(row.netAmountUsd)}</span>,

      },

      {

        key: 'waiting',

        header: 'Waiting',

        hideOnMobile: true,

        render: (row) => (

          <span className="text-slate-500 whitespace-nowrap">

            {row.status === 'completed' || row.status === 'paid'

              ? '—'

              : formatWaitingSince(row.createdAt)}

          </span>

        ),

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

            onClick={() => {

              setSelectedPayout(row);

              setRecordMode(false);

              resetError();

            }}

            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"

          >

            Review

          </button>

        ),

      },

    ],

    [resetError],

  );



  const handleTabChange = (tab: PayoutStatusTab) => {

    setStatusTab(tab);

    setStatusFilter('');

    setPage(1);

  };



  const handleClearFilters = () => {

    setStatusFilter('');

    setCountry('');

    setCurrency('');

    setPage(1);

  };



  const showRecordStepper = Boolean(selectedPayout && recordMode && isPayoutCompletable(selectedPayout));



  return (

    <FinancePage>

      {toastMessage && (

        <FinanceToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      )}



      <FinanceHeader

        title="Payouts"

        description="Monitor builder withdrawal requests and payout processing status."

      />



      <div className="flex flex-wrap gap-2">

        {STATUS_TABS.map((tab) => {

          const count = data?.groups[tab.id];

          const active = statusTab === tab.id && !statusFilter;

          return (

            <button

              key={tab.id}

              type="button"

              onClick={() => handleTabChange(tab.id)}

              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${

                active

                  ? 'bg-blue-600 border-blue-600 text-white'

                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'

              }`}

            >

              {tab.label}

              {typeof count === 'number' && (

                <span

                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-black ${

                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'

                  }`}

                >

                  {count}

                </span>

              )}

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

        searchPlaceholder="Search payouts…"

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

          rowKey={(row) => `${row.source}:${row.id}`}

          loading={loading}

          error={error}

          onRetry={() => void refresh()}

          emptyTitle="No payouts found"

          emptyDescription="Try another status tab or adjust your filters."

          page={data?.meta.page ?? page}

          totalPages={data?.meta.totalPages ?? 0}

          total={data?.meta.total}

          onPageChange={setPage}

        />

      </FinanceSection>



      <FinanceDrawer

        open={Boolean(selectedPayout)}

        onClose={handleCloseDrawer}

        title={showRecordStepper ? 'Record payout' : 'Payout review'}

        description={

          selectedPayout

            ? `${payoutSourceLabel(selectedPayout.source)} · ${selectedPayout.status}`

            : undefined

        }

        size="md"

      >

        {selectedPayout && showRecordStepper && (

          <PayoutRecordStepper

            payout={selectedPayout}

            loading={completing}

            error={completeError}

            onSubmit={handleSubmitRecord}

            onCancel={handleCloseDrawer}

            onResetError={resetError}

          />

        )}



        {selectedPayout && !showRecordStepper && (

          <div className="space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <DrawerField label="Builder" value={selectedPayout.builderName ?? selectedPayout.builderId} />

              <DrawerField label="Project" value={payoutSourceLabel(selectedPayout.source)} />

              <DrawerField label="Invoice" value={invoiceLabel(selectedPayout)} />

              <DrawerField label="Status" value={<FinanceStatusBadge status={selectedPayout.status} />} />

              <DrawerField label="Gross" value={formatUsd(selectedPayout.grossAmountUsd)} />

              <DrawerField label="Platform fee" value={formatUsd(selectedPayout.platformFeeUsd)} />

              <DrawerField label="Net" value={formatUsd(selectedPayout.netAmountUsd)} />

              <DrawerField label="Currency" value={selectedPayout.currency} />

              <DrawerField label="Payment method" value={paymentMethodLabel(selectedPayout.source)} />

              <DrawerField label="Country" value="—" />

              <DrawerField label="Waiting since" value={formatFinanceDate(selectedPayout.createdAt)} />

              <DrawerField label="Processed at" value={formatFinanceDate(selectedPayout.processedAt)} />

            </div>



            <PayoutCompletionAudit payout={selectedPayout} />



            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">

                Transaction history

              </p>

              <div className="space-y-2 text-sm">

                <div className="flex justify-between gap-4">

                  <span className="text-slate-500">Created</span>

                  <span className="font-medium text-slate-900">{formatFinanceDate(selectedPayout.createdAt)}</span>

                </div>

                {selectedPayout.processedAt && (

                  <div className="flex justify-between gap-4">

                    <span className="text-slate-500">Processed</span>

                    <span className="font-medium text-slate-900">

                      {formatFinanceDate(selectedPayout.processedAt)}

                    </span>

                  </div>

                )}

                {selectedPayout.withdrawalReference && (

                  <div className="flex justify-between gap-4">

                    <span className="text-slate-500">Reference</span>

                    <span className="font-mono text-xs font-medium text-slate-900">

                      {selectedPayout.withdrawalReference}

                    </span>

                  </div>

                )}

                {!selectedPayout.processedAt && !selectedPayout.withdrawalReference && (

                  <p className="text-slate-500">No additional transaction history available.</p>

                )}

              </div>

            </div>



            {isPayoutCompletable(selectedPayout) && (

              <div className="flex flex-wrap gap-2">

                <button

                  type="button"

                  onClick={() => {

                    setRecordMode(true);

                    resetError();

                  }}

                  className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"

                >

                  Record payment

                </button>

                <button

                  type="button"

                  onClick={handleCloseDrawer}

                  className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"

                >

                  Close

                </button>

              </div>

            )}



            {!isPayoutCompletable(selectedPayout) && (

              <div className="flex justify-end">

                <button

                  type="button"

                  onClick={handleCloseDrawer}

                  className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"

                >

                  Close

                </button>

              </div>

            )}

          </div>

        )}

      </FinanceDrawer>

    </FinancePage>

  );

}


