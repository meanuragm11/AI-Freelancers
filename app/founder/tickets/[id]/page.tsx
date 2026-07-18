"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Badge from '@/components/founder/Badge';
import InternalNotesPanel from '@/components/founder/InternalNotesPanel';
import TicketConversationAdmin from '@/components/founder/TicketConversationAdmin';
import BusinessTimeline from '@/components/founder/BusinessTimeline';
import {
  FOUNDER_TICKET_STATUSES,
  founderPriorityLabel,
  founderStatusLabel,
} from '@/lib/support/founderConstants';
import type { SupportAttachment } from '@/lib/support/types';

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

type Ticket = {
  id: string;
  ticket_number: string;
  user_id: string;
  display_name: string;
  email: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
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
  display_name: string;
  email: string;
  role: 'Buyer' | 'Builder' | 'Both';
  country: string | null;
  member_since: string;
  is_verified_builder: boolean;
  verified_buyer: boolean;
};

type AttachmentRow = SupportAttachment & {
  source: 'ticket' | 'message';
  uploaded_at: string;
  message_id?: string;
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(size?: number) {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(type: string) {
  return type.startsWith('image/') || type === 'application/pdf';
}

export default function FounderTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [related, setRelated] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/founder/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load ticket');
      setTicket(data.ticket);
      setUser(data.user ?? null);
      setRelated(data.related ?? {});
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async () => {
    setAttachmentsLoading(true);
    try {
      const res = await fetch(`/api/founder/tickets/${ticketId}/attachments`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load attachments');
      setAttachments(data.attachments ?? []);
    } catch {
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const updateTicket = async (updates: Record<string, unknown>) => {
    if (!ticket) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/founder/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket');
      setTicket((prev) => (prev ? { ...prev, ...data.ticket } : data.ticket));
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

  if (error && !ticket) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">
        {error}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">
        Ticket not found
      </div>
    );
  }

  const relatedLinks: Array<{ label: string; value: string; href: string }> = [];

  if (related.transaction) {
    relatedLinks.push({
      label: 'Transaction',
      value: `${related.transaction.order_id || related.transaction.id} · $${Number(related.transaction.amount_usd).toFixed(2)} · ${related.transaction.status}`,
      href: `/founder/payments?q=${related.transaction.id}`,
    });
  }
  if (related.escrow) {
    relatedLinks.push({
      label: 'Escrow',
      value: `${related.escrow.title} · ${related.escrow.status}`,
      href: `/founder/payments?tab=escrow&q=${related.escrow.id}`,
    });
  }
  if (related.project) {
    relatedLinks.push({
      label: 'Project',
      value: `${related.project.title} · ${related.project.status}`,
      href: `/founder/projects?q=${related.project.id}`,
    });
  }
  if (related.dispute) {
    relatedLinks.push({
      label: 'Dispute',
      value: `${related.dispute.primary_reason} · ${related.dispute.status}`,
      href: `/founder/disputes/${related.dispute.id}`,
    });
  }
  if (related.service) {
    relatedLinks.push({
      label: 'AI Solution',
      value: `${related.service.title} · ${related.service.status}`,
      href: `/founder/search?q=${related.service.id}`,
    });
  }
  if (related.legacySolution) {
    relatedLinks.push({
      label: 'Legacy Listing',
      value: `${related.legacySolution.title} · ${related.legacySolution.status}`,
      href: `/founder/search?q=${related.legacySolution.id}`,
    });
  }

  const quickActionLinks: Array<{ label: string; href: string; hidden?: boolean }> = [
    { label: 'View User Profile', href: `/founder/users/${ticket.user_id}` },
    {
      label: 'Open Payment',
      href: `/founder/payments?q=${related.transaction?.id || ticket.transaction_id || ''}`,
      hidden: !related.transaction && !ticket.transaction_id,
    },
    {
      label: 'Open Escrow',
      href: `/founder/payments?tab=escrow&q=${related.escrow?.id || ticket.escrow_id || ''}`,
      hidden: !related.escrow && !ticket.escrow_id,
    },
    {
      label: 'Open Dispute',
      href: `/founder/disputes/${related.dispute?.id || ''}`,
      hidden: !related.dispute,
    },
  ].filter((action) => !action.hidden);

  return (
    <div className="space-y-6">
      <Link href="/founder/tickets" className="inline-flex text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
        ← Back to Tickets
      </Link>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm font-medium text-rose-700">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm font-black font-mono text-slate-500">{ticket.ticket_number}</span>
              <Badge label={founderPriorityLabel(ticket.priority)} tone={PRIORITY_TONE[ticket.priority] || 'slate'} />
              <Badge label={founderStatusLabel(ticket.status)} tone={STATUS_TONE[ticket.status] || 'slate'} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{ticket.subject}</h1>
            <p className="text-sm text-slate-500 mt-2">{ticket.category}</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raised By</p>
                <p className="font-bold text-slate-800">{ticket.display_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                <p className="font-medium text-slate-700">{ticket.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Created</p>
                <p className="font-medium text-slate-700">{formatDateTime(ticket.created_at)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Updated</p>
                <p className="font-medium text-slate-700">{formatDateTime(ticket.updated_at)}</p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-56 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</p>
            <select
              value={ticket.status}
              disabled={saving}
              onChange={(e) => updateTicket({ status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 outline-none"
            >
              {(FOUNDER_TICKET_STATUSES.includes(ticket.status as (typeof FOUNDER_TICKET_STATUSES)[number])
                ? FOUNDER_TICKET_STATUSES
                : [...FOUNDER_TICKET_STATUSES, ticket.status as (typeof FOUNDER_TICKET_STATUSES)[number]]
              ).map((s) => (
                <option key={s} value={s}>
                  {founderStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TicketConversationAdmin
            ticketId={ticket.id}
            onStatusChange={(status) => setTicket((prev) => (prev ? { ...prev, status } : prev))}
          />

          <Panel title="Attachments">
            {attachmentsLoading && (
              <p className="text-sm text-slate-400">Loading attachments...</p>
            )}
            {!attachmentsLoading && attachments.length === 0 && (
              <p className="text-sm text-slate-400">No attachments on this ticket.</p>
            )}
            {!attachmentsLoading && attachments.length > 0 && (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div key={`${attachment.url}-${attachment.uploaded_at}`} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-blue-600 hover:text-blue-700"
                        >
                          {attachment.name}
                        </a>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                          {formatFileSize(attachment.size)} · {formatDateTime(attachment.uploaded_at)}
                        </p>
                      </div>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600"
                      >
                        Download
                      </a>
                    </div>
                    {isPreviewable(attachment.type) && attachment.type.startsWith('image/') && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="mt-3 max-h-56 rounded border border-slate-100 object-contain"
                      />
                    )}
                    {isPreviewable(attachment.type) && attachment.type === 'application/pdf' && (
                      <iframe
                        src={attachment.url}
                        title={attachment.name}
                        className="mt-3 h-56 w-full rounded border border-slate-100"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {user && (
            <Panel title="Customer Information">
              <p className="font-black text-slate-900">{user.display_name}</p>
              <p className="text-sm text-slate-500 mt-1">{user.email}</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-medium">Role</span>
                  <span className="font-bold text-slate-700">{user.role}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-medium">Country</span>
                  <span className="font-bold text-slate-700">{user.country || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-medium">Member Since</span>
                  <span className="font-bold text-slate-700">{new Date(user.member_since).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {user.verified_buyer && <Badge label="Verified Buyer" tone="green" />}
                {user.is_verified_builder && <Badge label="Verified Builder" tone="green" />}
              </div>
              <Link
                href={`/founder/users/${user.id}`}
                className="inline-block mt-4 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
              >
                Profile →
              </Link>
            </Panel>
          )}

          <Panel title="Quick Actions">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={saving || ticket.status === 'resolved'}
                onClick={() => updateTicket({ status: 'resolved' })}
                className="w-full px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest"
              >
                Mark Resolved
              </button>
              <button
                type="button"
                disabled={saving || ticket.status === 'closed'}
                onClick={() => updateTicket({ status: 'closed' })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-xs font-black uppercase tracking-widest text-slate-700"
              >
                Close Ticket
              </button>
              {quickActionLinks.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-200 text-center text-xs font-black uppercase tracking-widest text-blue-600"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </Panel>

          {relatedLinks.length > 0 && (
            <Panel title="Related Records">
              <div className="space-y-3">
                {relatedLinks.map((row) => (
                  <Link
                    key={row.label}
                    href={row.href}
                    className="block rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 hover:border-blue-200 transition-colors"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{row.label}</p>
                    <p className="text-sm font-bold text-slate-700">{row.value}</p>
                  </Link>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Business Timeline">
            <BusinessTimeline entityType="support_ticket" entityId={ticket.id} order="asc" />
          </Panel>

          <InternalNotesPanel entityType="support_ticket" entityId={ticket.id} order="asc" />
        </div>
      </div>
    </div>
  );
}
