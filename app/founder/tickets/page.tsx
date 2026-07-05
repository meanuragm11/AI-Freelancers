"use client";

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_ACTIVE_STATUSES, SUPPORT_RESOLVED_STATUSES } from '@/lib/support/constants';

type TicketView = 'active' | 'resolved';

const TABS: { id: TicketView; label: string }[] = [
  { id: 'active', label: 'Active Tickets' },
  { id: 'resolved', label: 'Resolved' },
];

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
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

type Admin = { id: string; full_name: string | null };

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
};

function FounderTicketsInner() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get('userId');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [view, setView] = useState<TicketView>('active');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ view });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);
      if (assignedTo) params.set('assignedTo', assignedTo);
      if (userIdFilter) params.set('userId', userIdFilter);

      const res = await fetch(`/api/founder/tickets?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
      setTickets(data.tickets ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    fetch('/api/founder/admins')
      .then((res) => res.json())
      .then((data) => setAdmins(data.admins ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, view, status, category, priority, assignedTo, userIdFilter]);

  const statusOptions = view === 'resolved' ? SUPPORT_RESOLVED_STATUSES : SUPPORT_ACTIVE_STATUSES;

  const adminNameById = useMemo(() => {
    const map = new Map<string, string>();
    admins.forEach((admin) => map.set(admin.id, admin.full_name || 'Admin'));
    return map;
  }, [admins]);

  return (
    <div>
      <SectionHeader
        eyebrow="Support"
        title="Support Tickets"
        description="Every customer support request across the marketplace, with assignment and internal notes."
      />

      {userIdFilter && (
        <div className="mb-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
          Filtered to one user
          <Link href="/founder/tickets" className="text-blue-500 hover:text-blue-800">✕</Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setView(t.id);
              setStatus('');
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              view === t.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ticket ID, subject, name, or email..."
          className="flex-1 min-w-[220px] bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Categories</option>
          {SUPPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Priorities</option>
          {SUPPORT_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">Anyone Assigned</option>
          <option value="unassigned">Unassigned</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.full_name || 'Admin'}
            </option>
          ))}
        </select>
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Ticket</th>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Assigned To</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Last Reply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                      {view === 'resolved' ? 'No resolved tickets match these filters.' : 'No active tickets match these filters.'}
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/founder/tickets/${ticket.id}`} className="block">
                          <p className="font-mono text-xs font-bold text-slate-400">{ticket.ticket_number}</p>
                          <p className="font-bold text-slate-900">{ticket.subject}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-700">{ticket.name}</p>
                        <p className="text-xs text-slate-400">{ticket.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">{ticket.category}</td>
                      <td className="px-5 py-4">
                        <Badge label={ticket.priority} tone={PRIORITY_TONE[ticket.priority] || 'slate'} />
                      </td>
                      <td className="px-5 py-4">
                        <Badge label={ticket.status} tone={STATUS_TONE[ticket.status] || 'slate'} />
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {ticket.assigned_to ? adminNameById.get(ticket.assigned_to) || 'Admin' : '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-medium">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-medium">
                        {new Date(ticket.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
