"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import {
  DISPUTE_DECISION_LABELS,
  DISPUTE_PRIORITY_LABELS,
  DISPUTE_STATUS_LABELS,
  FOUNDER_DISPUTE_STATUS_FILTERS,
  DISPUTE_PRIORITIES,
  DISPUTE_DECISION_TYPES,
} from '@/lib/founder/constants';
import { formatDisplayName } from '@/lib/display/formatDisplayName';
import { money } from '@/lib/founder/utils';

type Dispute = {
  id: string;
  status: string;
  priority: string;
  decision_type: string;
  primary_reason: string;
  created_at: string;
  updated_at: string;
  buyer: { id: string; full_name: string | null } | null;
  freelancer: { id: string; full_name: string | null } | null;
  collab: { id: string; title: string | null; escrow_amount_usd: number | null; status: string | null } | null;
};

const STATUS_TONE: Record<string, 'blue' | 'amber' | 'purple' | 'rose' | 'green' | 'slate'> = {
  open: 'blue',
  under_investigation: 'amber',
  decision_recorded: 'purple',
  waiting_for_payment_execution: 'rose',
  closed: 'slate',
};

const PRIORITY_TONE: Record<string, 'slate' | 'amber' | 'rose'> = {
  low: 'slate',
  medium: 'amber',
  high: 'rose',
  critical: 'rose',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function FounderDisputesInner() {
  const searchParams = useSearchParams();
  const collabFilter = searchParams.get('collabId');

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState(collabFilter || '');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [decision, setDecision] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (decision) params.set('decision', decision);

      const res = await fetch(`/api/founder/disputes?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load disputes');
      setDisputes(data.disputes ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [q, status, priority, decision]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, priority, decision, page]);

  return (
    <div>
      <SectionHeader
        eyebrow="Trust & Safety"
        title="Dispute Center"
        description="Who should receive the escrow? Review cases, record decisions, and execute payments in Payments."
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="md:hidden w-full flex items-center justify-between min-h-[44px] text-xs font-black uppercase tracking-widest text-slate-600"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
          </span>
          <svg className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div className={`${filtersOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row flex-wrap gap-3 mt-3 md:mt-0`}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search dispute ID, project name, buyer/builder, email, project ID..."
          className="w-full md:flex-1 md:min-w-0 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 min-h-[44px] text-sm font-medium outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Statuses</option>
          {FOUNDER_DISPUTE_STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {DISPUTE_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Priorities</option>
          {DISPUTE_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {DISPUTE_PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Decisions</option>
          {DISPUTE_DECISION_TYPES.map((value) => (
            <option key={value} value={value}>
              {DISPUTE_DECISION_LABELS[value]}
            </option>
          ))}
        </select>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Loading disputes...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <ResponsiveTable
              rows={disputes}
              rowKey={(dispute) => dispute.id}
              emptyMessage="No disputes match these filters."
              renderMobileCard={(dispute) => (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={DISPUTE_STATUS_LABELS[dispute.status] || dispute.status} tone={STATUS_TONE[dispute.status] || 'slate'} />
                    <Badge label={DISPUTE_PRIORITY_LABELS[dispute.priority] || dispute.priority} tone={PRIORITY_TONE[dispute.priority] || 'slate'} />
                  </div>
                  <p className="font-bold text-slate-900 break-words">{dispute.collab?.title || 'Untitled Project'}</p>
                  <p className="font-mono text-xs font-bold text-slate-500">{dispute.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm font-bold text-rose-700">{money(dispute.collab?.escrow_amount_usd)} escrow</p>
                  <p className="text-sm text-slate-500 line-clamp-2">{dispute.primary_reason}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Buyer</p>
                      <p className="font-bold text-slate-700">{formatDisplayName(dispute.buyer?.full_name)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Builder</p>
                      <p className="font-bold text-slate-700">{formatDisplayName(dispute.freelancer?.full_name)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{formatDateTime(dispute.created_at)}</p>
                  <Link
                    href={`/founder/disputes/${dispute.id}`}
                    className="inline-flex min-h-[44px] items-center text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                  >
                    Open Dispute →
                  </Link>
                </div>
              )}
              columns={[
                {
                  key: 'status',
                  header: 'Status',
                  render: (dispute) => <Badge label={DISPUTE_STATUS_LABELS[dispute.status] || dispute.status} tone={STATUS_TONE[dispute.status] || 'slate'} />,
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  render: (dispute) => <Badge label={DISPUTE_PRIORITY_LABELS[dispute.priority] || dispute.priority} tone={PRIORITY_TONE[dispute.priority] || 'slate'} />,
                },
                {
                  key: 'decision',
                  header: 'Decision',
                  render: (dispute) => <Badge label={DISPUTE_DECISION_LABELS[dispute.decision_type] || dispute.decision_type} tone={dispute.decision_type === 'pending' ? 'amber' : 'blue'} />,
                },
                {
                  key: 'id',
                  header: 'Dispute ID',
                  render: (dispute) => <span className="font-mono text-xs font-bold text-slate-500">{dispute.id.slice(0, 8).toUpperCase()}</span>,
                },
                {
                  key: 'project',
                  header: 'Project',
                  cellClassName: 'font-bold text-slate-900 max-w-[200px] truncate',
                  render: (dispute) => dispute.collab?.title || 'Untitled Project',
                },
                {
                  key: 'escrow',
                  header: 'Escrow',
                  render: (dispute) => <span className="font-bold text-rose-700">{money(dispute.collab?.escrow_amount_usd)}</span>,
                },
                {
                  key: 'buyer',
                  header: 'Buyer',
                  render: (dispute) => <span className="font-bold text-slate-700">{formatDisplayName(dispute.buyer?.full_name)}</span>,
                },
                {
                  key: 'builder',
                  header: 'Builder',
                  render: (dispute) => <span className="font-bold text-slate-700">{formatDisplayName(dispute.freelancer?.full_name)}</span>,
                },
                {
                  key: 'reason',
                  header: 'Reason',
                  hideOnMobile: true,
                  cellClassName: 'text-slate-500 max-w-[180px] truncate',
                  render: (dispute) => dispute.primary_reason,
                },
                {
                  key: 'opened',
                  header: 'Opened',
                  hideOnMobile: true,
                  render: (dispute) => <span className="text-slate-400 font-medium">{formatDateTime(dispute.created_at)}</span>,
                },
                {
                  key: 'action',
                  header: 'Action',
                  render: (dispute) => (
                    <Link href={`/founder/disputes/${dispute.id}`} className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
                      Open
                    </Link>
                  ),
                },
              ]}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 text-xs font-bold text-slate-500">
            <span>
              {total} dispute{total === 1 ? '' : 's'} · page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function FounderDisputesPage() {
  return (
    <Suspense fallback={null}>
      <FounderDisputesInner />
    </Suspense>
  );
}
