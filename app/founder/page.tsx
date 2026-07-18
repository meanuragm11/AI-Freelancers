"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/founder/SectionHeader';
import { formatAttentionStatus } from '@/lib/founder/overview';

type AttentionItem = {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'support_ticket' | 'dispute' | 'moderation';
  title: string;
  created_at: string;
  status: string;
  href: string;
};

type Snapshot = {
  activeUsers: number;
  activeProjects: number;
  openSupportTickets: number;
  openDisputes: number;
  pendingAiReviews: number;
  activeEscrowValue: number;
};

type ActivityEvent = {
  id: string;
  time: string;
  event: string;
  reference: string;
  href: string | null;
};

type SectionState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

const ATTENTION_TYPE_LABELS: Record<AttentionItem['type'], string> = {
  support_ticket: 'Support Ticket',
  dispute: 'Dispute',
  moderation: 'AI Moderation',
};

const PRIORITY_LABELS: Record<AttentionItem['priority'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function SectionError({ message }: { message: string }) {
  return (
    <p className="px-4 py-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
      {message}
    </p>
  );
}

function TableLoading({ label }: { label: string }) {
  return <p className="text-sm text-slate-500 py-4">{label}</p>;
}

export default function FounderOverviewPage() {
  const [attention, setAttention] = useState<SectionState<{ items: AttentionItem[]; pagination: { page: number; totalPages: number; total: number } }>>({
    data: null,
    loading: true,
    error: null,
  });
  const [snapshot, setSnapshot] = useState<SectionState<Snapshot>>({
    data: null,
    loading: false,
    error: null,
  });
  const [activity, setActivity] = useState<SectionState<{ events: ActivityEvent[] }>>({
    data: null,
    loading: false,
    error: null,
  });
  const [attentionPage, setAttentionPage] = useState(1);

  const loadAttention = useCallback(async (page: number) => {
    setAttention((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/founder/overview/attention?page=${page}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load attention queue');
      setAttention({ data: payload, loading: false, error: null });
    } catch (err: unknown) {
      setAttention({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load attention queue',
      });
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    setSnapshot((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/founder/overview/snapshot');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load snapshot');
      setSnapshot({ data: payload, loading: false, error: null });
    } catch (err: unknown) {
      setSnapshot({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load snapshot',
      });
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivity((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/founder/overview/activity');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load activity');
      setActivity({ data: payload, loading: false, error: null });
    } catch (err: unknown) {
      setActivity({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load activity',
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      await loadAttention(attentionPage);
      if (cancelled) return;
      await loadSnapshot();
      if (cancelled) return;
      await loadActivity();
    }

    void loadSections();
    return () => {
      cancelled = true;
    };
  }, [attentionPage, loadAttention, loadSnapshot, loadActivity]);

  return (
    <div>
      <SectionHeader
        eyebrow="Operations Console"
        title="Overview"
        description="Unresolved work queue, marketplace counters, and recent platform activity."
      />

      <div className="space-y-10">
        {/* Section 1 — Needs Attention */}
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Needs Attention</h2>
          {attention.loading && !attention.data && <TableLoading label="Loading attention queue…" />}
          {attention.error && <SectionError message={attention.error} />}
          {attention.data && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-semibold">Priority</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Title</th>
                      <th className="px-4 py-2 font-semibold">Created</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attention.data.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          No items need attention.
                        </td>
                      </tr>
                    ) : (
                      attention.data.items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            {PRIORITY_LABELS[item.priority]}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{ATTENTION_TYPE_LABELS[item.type]}</td>
                          <td className="px-4 py-2.5 text-slate-900 max-w-xs truncate">{item.title}</td>
                          <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatTime(item.created_at)}</td>
                          <td className="px-4 py-2.5 text-slate-600 capitalize">{formatAttentionStatus(item.status)}</td>
                          <td className="px-4 py-2.5">
                            <Link href={item.href} className="text-blue-600 hover:text-blue-700 font-medium">
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {attention.data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50 text-sm">
                  <span className="text-slate-500">
                    Page {attention.data.pagination.page} of {attention.data.pagination.totalPages} ({attention.data.pagination.total} items)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={attentionPage <= 1 || attention.loading}
                      onClick={() => setAttentionPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 border border-slate-300 rounded disabled:opacity-40 hover:bg-white"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={
                        attentionPage >= attention.data.pagination.totalPages || attention.loading
                      }
                      onClick={() => setAttentionPage((p) => p + 1)}
                      className="px-3 py-1 border border-slate-300 rounded disabled:opacity-40 hover:bg-white"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 2 — Marketplace Snapshot */}
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Marketplace Snapshot</h2>
          {snapshot.loading && !snapshot.data && <TableLoading label="Loading counters…" />}
          {snapshot.error && <SectionError message={snapshot.error} />}
          {snapshot.data && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Active Users', value: snapshot.data.activeUsers.toLocaleString() },
                { label: 'Active Projects', value: snapshot.data.activeProjects.toLocaleString() },
                { label: 'Open Support Tickets', value: snapshot.data.openSupportTickets.toLocaleString() },
                { label: 'Open Disputes', value: snapshot.data.openDisputes.toLocaleString() },
                { label: 'Pending AI Reviews', value: snapshot.data.pendingAiReviews.toLocaleString() },
                { label: 'Active Escrow Value', value: money(snapshot.data.activeEscrowValue) },
              ].map((counter) => (
                <div key={counter.label} className="border border-slate-200 rounded-lg bg-white px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">{counter.label}</p>
                  <p className="text-lg font-semibold text-slate-900">{counter.value}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — Latest Marketplace Activity */}
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Latest Marketplace Activity</h2>
          {activity.loading && !activity.data && <TableLoading label="Loading activity…" />}
          {activity.error && <SectionError message={activity.error} />}
          {activity.data && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-semibold">Time</th>
                      <th className="px-4 py-2 font-semibold">Event</th>
                      <th className="px-4 py-2 font-semibold">Reference</th>
                      <th className="px-4 py-2 font-semibold">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.data.events.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No recent activity recorded.
                        </td>
                      </tr>
                    ) : (
                      activity.data.events.map((event) => (
                        <tr key={event.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatTime(event.time)}</td>
                          <td className="px-4 py-2.5 text-slate-900 capitalize">{event.event}</td>
                          <td className="px-4 py-2.5 text-slate-600 max-w-md truncate">{event.reference}</td>
                          <td className="px-4 py-2.5">
                            {event.href ? (
                              <Link href={event.href} className="text-blue-600 hover:text-blue-700 font-medium">
                                Open
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
