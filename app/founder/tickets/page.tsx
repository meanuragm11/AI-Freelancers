"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import {
  FOUNDER_TICKET_CATEGORIES,
  FOUNDER_TICKET_PRIORITIES,
  FOUNDER_TICKET_STATUSES,
  founderPriorityLabel,
  founderStatusLabel,
} from '@/lib/support/founderConstants';
import { formatDisplayName } from '@/lib/display/formatDisplayName';

type Ticket = {
  id: string;
  ticket_number: string;
  user_id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
};

const STATUS_TONE: Record<string, 'blue' | 'amber' | 'purple' | 'green' | 'slate' | 'rose'> = {
  open: 'blue',
  in_progress: 'amber',
  waiting_for_user: 'purple',
  arbitration_requested: 'rose',
  resolved: 'green',
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

function FounderTicketsInner() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get('userId');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);
      if (userIdFilter) params.set('userId', userIdFilter);

      const res = await fetch(`/api/founder/tickets?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
      setTickets(data.tickets ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [q, status, category, priority, userIdFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, category, priority, userIdFilter, page]);

  return (
    <div>
      <SectionHeader
        eyebrow="Support"
        title="Support Tickets"
        description="Lightweight queue for customer support — filter, open, and resolve quickly."
      />

      {userIdFilter && (
        <div className="mb-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
          Filtered to one user
          <Link href="/founder/tickets" className="text-blue-500 hover:text-blue-800">✕</Link>
        </div>
      )}

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
          placeholder="Search ticket ID, name, email, or subject..."
          className="w-full md:flex-1 md:min-w-0 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 min-h-[44px] text-sm font-medium outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Statuses</option>
          {FOUNDER_TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {founderStatusLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Categories</option>
          {FOUNDER_TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Priorities</option>
          {FOUNDER_TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {founderPriorityLabel(p)}
            </option>
          ))}
        </select>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Loading tickets...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <ResponsiveTable
              rows={tickets}
              rowKey={(ticket) => ticket.id}
              emptyMessage="No tickets match these filters."
              renderMobileCard={(ticket) => (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={founderStatusLabel(ticket.status)} tone={STATUS_TONE[ticket.status] || 'slate'} />
                    <Badge label={founderPriorityLabel(ticket.priority)} tone={PRIORITY_TONE[ticket.priority] || 'slate'} />
                  </div>
                  <p className="font-bold text-slate-900 break-words">{ticket.subject}</p>
                  <p className="font-mono text-xs font-bold text-slate-500">{ticket.ticket_number}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Raised By</p>
                      <p className="font-bold text-slate-700">{formatDisplayName(ticket.name)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Category</p>
                      <p className="font-medium text-slate-600">{ticket.category}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{ticket.email}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(ticket.created_at)}</p>
                  <Link
                    href={`/founder/tickets/${ticket.id}`}
                    className="inline-flex min-h-[44px] items-center text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                  >
                    Open Ticket →
                  </Link>
                </div>
              )}
              columns={[
                {
                  key: 'status',
                  header: 'Status',
                  render: (ticket) => <Badge label={founderStatusLabel(ticket.status)} tone={STATUS_TONE[ticket.status] || 'slate'} />,
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  render: (ticket) => <Badge label={founderPriorityLabel(ticket.priority)} tone={PRIORITY_TONE[ticket.priority] || 'slate'} />,
                },
                {
                  key: 'ticket_number',
                  header: 'Ticket ID',
                  render: (ticket) => <span className="font-mono text-xs font-bold text-slate-500">{ticket.ticket_number}</span>,
                },
                {
                  key: 'subject',
                  header: 'Subject',
                  cellClassName: 'font-bold text-slate-900 max-w-[220px] truncate',
                  render: (ticket) => ticket.subject,
                },
                {
                  key: 'category',
                  header: 'Category',
                  render: (ticket) => <span className="text-slate-600 font-medium">{ticket.category}</span>,
                },
                {
                  key: 'name',
                  header: 'Raised By',
                  render: (ticket) => <span className="font-bold text-slate-700">{formatDisplayName(ticket.name)}</span>,
                },
                {
                  key: 'email',
                  header: 'Email',
                  hideOnMobile: true,
                  render: (ticket) => <span className="text-xs text-slate-500">{ticket.email}</span>,
                },
                {
                  key: 'created_at',
                  header: 'Created',
                  hideOnMobile: true,
                  render: (ticket) => <span className="text-slate-400 font-medium">{formatDateTime(ticket.created_at)}</span>,
                },
                {
                  key: 'updated_at',
                  header: 'Last Updated',
                  hideOnMobile: true,
                  render: (ticket) => <span className="text-slate-400 font-medium">{formatDateTime(ticket.updated_at)}</span>,
                },
                {
                  key: 'action',
                  header: 'Action',
                  render: (ticket) => (
                    <Link
                      href={`/founder/tickets/${ticket.id}`}
                      className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                    >
                      Open
                    </Link>
                  ),
                },
              ]}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 text-xs font-bold text-slate-500">
            <span>
              {total} ticket{total === 1 ? '' : 's'} · page {page} of {totalPages}
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

export default function FounderTicketsPage() {
  return (
    <Suspense fallback={null}>
      <FounderTicketsInner />
    </Suspense>
  );
}
