"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Badge from '@/components/founder/Badge';
import InternalNotesPanel from '@/components/founder/InternalNotesPanel';
import TicketConversationAdmin from '@/components/founder/TicketConversationAdmin';
import BusinessTimeline from '@/components/founder/BusinessTimeline';
import { SUPPORT_STATUSES } from '@/lib/support/constants';

const STATUS_TONE: Record<string, 'blue' | 'amber' | 'purple' | 'green' | 'slate' | 'rose'> = {
  open: 'blue',
  in_progress: 'amber',
  waiting_for_user: 'purple',
  arbitration_requested: 'rose',
  resolved: 'green',
  closed: 'slate',
};

const isResolvedStatus = (status: string) => status === 'resolved' || status === 'closed';

type Ticket = {
  id: string;
  ticket_number: string;
  user_id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  transaction_id: string | null;
  escrow_id: string | null;
  project_id: string | null;
  service_id: string | null;
  ai_asset_id: string | null;
  created_at: string;
  updated_at: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  is_freelancer: boolean;
  is_admin: boolean;
  is_verified: boolean;
  kyc_status: string | null;
  average_rating: number | null;
  review_count: number | null;
  created_at: string;
  last_active_at: string | null;
};

type Admin = { id: string; full_name: string | null };

export default function FounderTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [related, setRelated] = useState<Record<string, any>>({});
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/founder/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load ticket');
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
      setUser(data.user ?? null);
      setRelated(data.related ?? {});
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load ticket');
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
  }, [ticketId]);

  const updateTicket = async (updates: Record<string, unknown>) => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/founder/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket');
      setTicket(data.ticket);
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-xs font-black uppercase tracking-widest text-slate-400">
        Loading ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">
        {error || 'Ticket not found'}
      </div>
    );
  }

  const relatedRows: Array<[string, string, string]> = [
    ...(related.transaction
      ? [[
          'Transaction',
          `${related.transaction.order_id || related.transaction.id} · $${Number(related.transaction.amount_usd).toFixed(2)} · ${related.transaction.status}`,
          `/founder/payments?q=${related.transaction.id}`,
        ] as [string, string, string]]
      : []),
    ...(related.escrow
      ? [[
          'Escrow / Project',
          `${related.escrow.title} · ${related.escrow.status}`,
          `/founder/payments?q=${related.escrow.id}`,
        ] as [string, string, string]]
      : []),
    ...(related.project
      ? [[
          'Project',
          `${related.project.title} · ${related.project.status}`,
          `/founder/payments?q=${related.project.id}`,
        ] as [string, string, string]]
      : []),
    ...(related.service
      ? [[
          'Service',
          `${related.service.title} · ${related.service.status}`,
          `/founder/search?q=${related.service.id}`,
        ] as [string, string, string]]
      : []),
    ...(related.aiAsset
      ? [[
          'AI Asset',
          `${related.aiAsset.title} · ${related.aiAsset.status}`,
          `/founder/search?q=${related.aiAsset.id}`,
        ] as [string, string, string]]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Link href="/founder/tickets" className="inline-flex text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
        ← Back to Tickets
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm font-black font-mono text-slate-500">{ticket.ticket_number}</span>
              <Badge label={ticket.status} tone={STATUS_TONE[ticket.status] || 'slate'} />
              <Badge label={`${ticket.priority} priority`} tone="amber" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{ticket.subject}</h1>
            <p className="text-sm text-slate-500 mt-2">{ticket.category}</p>
            <p className="text-sm text-slate-600 mt-4 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">
              {ticket.message}
            </p>
          </div>
          {!isResolvedStatus(ticket.status) && (
            <button
              type="button"
              disabled={saving}
              onClick={() => updateTicket({ status: 'resolved' })}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest transition-colors"
            >
              Mark as Resolved
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</p>
            <select
              value={ticket.status}
              disabled={saving}
              onChange={(e) => updateTicket({ status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 outline-none"
            >
              {SUPPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Assigned To</p>
            <select
              value={ticket.assigned_to || ''}
              disabled={saving}
              onChange={(e) => updateTicket({ assignedTo: e.target.value || null })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 outline-none"
            >
              <option value="">Unassigned</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name || 'Admin'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Opened</p>
            <p className="text-sm font-bold text-slate-700 py-2.5">{new Date(ticket.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TicketConversationAdmin
            ticketId={ticket.id}
            messages={messages}
            onMessageSent={(message) => setMessages((prev) => [...prev, message])}
          />
        </div>

        <div className="space-y-6">
          {user && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">User Profile</h3>
              <Link href={`/founder/users/${user.id}`} className="block hover:opacity-80 transition-opacity">
                <p className="font-black text-slate-900">{user.full_name || ticket.name}</p>
                <p className="text-xs text-slate-400">{ticket.email}</p>
              </Link>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge label={user.role || 'user'} tone="slate" />
                {user.is_freelancer && <Badge label="Builder" tone="purple" />}
                {user.is_verified && <Badge label="Verified" tone="green" />}
                {user.is_admin && <Badge label="Admin" tone="rose" />}
              </div>
              <Link
                href={`/founder/users/${user.id}`}
                className="inline-block mt-4 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
              >
                View Full Profile →
              </Link>
            </div>
          )}

          {relatedRows.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Related Records</h3>
              <div className="space-y-3">
                {relatedRows.map(([label, value, href]) => (
                  <Link key={label} href={href} className="block rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 hover:border-blue-200 transition-colors">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                    <p className="text-sm font-bold text-slate-700">{value}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Business Timeline</h3>
            <BusinessTimeline entityType="support_ticket" entityId={ticket.id} />
          </div>

          <InternalNotesPanel entityType="support_ticket" entityId={ticket.id} />
        </div>
      </div>
    </div>
  );
}
