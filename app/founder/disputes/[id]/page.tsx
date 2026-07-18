"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Badge from '@/components/founder/Badge';
import InternalNotesPanel from '@/components/founder/InternalNotesPanel';
import {
  DISPUTE_DECISION_LABELS,
  DISPUTE_DECISION_OPTIONS,
  DISPUTE_PRIORITY_LABELS,
  DISPUTE_STATUS_LABELS,
} from '@/lib/founder/constants';
import { founderPaymentsPathForDispute } from '@/lib/disputes/constants';
import { money } from '@/lib/founder/utils';

type Participant = {
  id: string;
  display_name: string;
  email: string | null;
  country: string | null;
  member_since: string;
  completed_projects: number;
  is_verified: boolean;
  verified_buyer: boolean;
  profile_href: string;
};

type EvidenceRow = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by_name: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  sender_name: string;
  body: string;
  created_at: string;
  message_kind: string;
};

type TimelineRow = {
  id: string;
  actor_role: string;
  entry_type: string;
  description: string;
  created_at: string;
  actor?: { full_name?: string | null } | null;
  files?: Array<{ name?: string; url?: string; file_name?: string; file_url?: string }> | null;
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

function formatFileSize(size?: number | null) {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(type?: string | null) {
  return Boolean(type?.startsWith('image/') || type === 'application/pdf');
}

function ParticipantCard({ label, participant }: { label: string; participant: Participant }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">{label}</p>
      <div className="space-y-2 text-sm">
        <p className="font-black text-slate-900">{participant.display_name}</p>
        <p className="text-slate-500">{participant.email || '—'}</p>
        <p className="text-slate-500">Country: {participant.country || '—'}</p>
        <p className="text-slate-500">Member since: {formatDateTime(participant.member_since)}</p>
        <p className="text-slate-500">Completed projects: {participant.completed_projects}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {participant.is_verified && <Badge label="Verified Builder" tone="green" />}
          {participant.verified_buyer && <Badge label="Verified Buyer" tone="blue" />}
        </div>
        <Link href={participant.profile_href} className="inline-flex text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 pt-2">
          Open Profile
        </Link>
      </div>
    </div>
  );
}

export default function FounderDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const disputeId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispute, setDispute] = useState<any>(null);
  const [buyer, setBuyer] = useState<Participant | null>(null);
  const [builder, setBuilder] = useState<Participant | null>(null);

  const [buyerEvidence, setBuyerEvidence] = useState<EvidenceRow[]>([]);
  const [builderEvidence, setBuilderEvidence] = useState<EvidenceRow[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [conversationLoading, setConversationLoading] = useState(true);

  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [decisionType, setDecisionType] = useState('');
  const [decisionSummary, setDecisionSummary] = useState('');
  const [buyerSplitPct, setBuyerSplitPct] = useState('');
  const [builderSplitPct, setBuilderSplitPct] = useState('');
  const [saving, setSaving] = useState(false);
  const [investigating, setInvestigating] = useState(false);

  const loadCore = async () => {
    const res = await fetch(`/api/founder/disputes/${disputeId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load dispute');
    setDispute(data.dispute);
    setBuyer(data.buyer ?? null);
    setBuilder(data.builder ?? null);
    if (data.dispute?.decision_type && data.dispute.decision_type !== 'pending') {
      setDecisionType(data.dispute.decision_type);
      setDecisionSummary(data.dispute.decision_summary || '');
      setBuyerSplitPct(data.dispute.buyer_split_pct != null ? String(data.dispute.buyer_split_pct) : '');
      setBuilderSplitPct(data.dispute.builder_split_pct != null ? String(data.dispute.builder_split_pct) : '');
    }
  };

  const loadEvidence = async () => {
    setEvidenceLoading(true);
    try {
      const res = await fetch(`/api/founder/disputes/${disputeId}/evidence`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load evidence');
      setBuyerEvidence(data.buyerEvidence ?? []);
      setBuilderEvidence(data.builderEvidence ?? []);
    } catch {
      setBuyerEvidence([]);
      setBuilderEvidence([]);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const loadConversation = async () => {
    setConversationLoading(true);
    try {
      const res = await fetch(`/api/founder/disputes/${disputeId}/conversation`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversation');
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setConversationLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/founder/disputes/${disputeId}/history`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load history');
      setTimeline(data.timeline ?? []);
    } catch {
      setTimeline([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        await loadCore();
        void loadEvidence();
        void loadConversation();
        void loadHistory();
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load dispute');
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  const patchDispute = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/founder/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update dispute');
      await loadCore();
      await loadHistory();
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update dispute');
    } finally {
      setSaving(false);
      setInvestigating(false);
    }
  };

  const startInvestigation = async () => {
    setInvestigating(true);
    await patchDispute({ action: 'start_investigation' });
  };

  const saveDecision = async () => {
    await patchDispute({
      action: 'save_decision',
      decisionType,
      decisionSummary,
      buyerSplitPct: decisionType === 'split' ? Number(buyerSplitPct) : undefined,
      builderSplitPct: decisionType === 'split' ? Number(builderSplitPct) : undefined,
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-xs font-black uppercase tracking-widest text-slate-400">Loading dispute...</div>;
  }

  if (error && !dispute) {
    return <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>;
  }

  if (!dispute || !buyer || !builder) return null;

  const paymentsHref = founderPaymentsPathForDispute(dispute.collab_id, dispute.id);
  const canEditDecision = dispute.can_save_decision;
  const splitTotal =
    decisionType === 'split'
      ? Number(buyerSplitPct || 0) + Number(builderSplitPct || 0)
      : 100;

  return (
    <div className="space-y-6">
      <Link href="/founder/disputes" className="inline-flex text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
        ← Back to Disputes
      </Link>

      {error && <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm font-medium text-rose-700">{error}</div>}

      <div className="flex flex-wrap gap-3">
        {dispute.can_start_investigation && (
          <button
            type="button"
            onClick={() => void startInvestigation()}
            disabled={investigating}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            {investigating ? 'Starting...' : 'Start Investigation'}
          </button>
        )}
        <Link href={`/collab/${dispute.collab_id}`} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">
          Open Project
        </Link>
        <Link href={buyer.profile_href} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">
          Open Buyer Profile
        </Link>
        <Link href={builder.profile_href} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">
          Open Builder Profile
        </Link>
        <Link href={paymentsHref} className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest">
          Open Payments
        </Link>
      </div>

      <Panel title="Case Summary">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dispute ID</p>
            <p className="font-mono font-bold text-slate-900">{dispute.short_id}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
            <Badge label={DISPUTE_STATUS_LABELS[dispute.status] || dispute.status} tone="blue" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</p>
            <Badge label={DISPUTE_PRIORITY_LABELS[dispute.priority] || dispute.priority} tone="amber" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decision</p>
            <Badge label={DISPUTE_DECISION_LABELS[dispute.decision_type] || dispute.decision_type} tone="purple" />
          </div>
          <div className="md:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project</p>
            <p className="font-bold text-slate-900">{dispute.collab?.title || 'Untitled Project'}</p>
            <p className="text-xs text-slate-500 font-mono mt-1">{dispute.collab_id}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escrow Amount</p>
            <p className="font-black text-rose-700 text-lg">{money(dispute.collab?.escrow_amount_usd)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Opened</p>
            <p className="text-slate-700">{formatDateTime(dispute.created_at)}</p>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</p>
            <p className="text-slate-700">{dispute.primary_reason}</p>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detailed Explanation</p>
            <p className="text-slate-700 whitespace-pre-wrap">{dispute.detailed_explanation}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Buyer & Builder">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ParticipantCard label="Buyer" participant={buyer} />
          <ParticipantCard label="Builder" participant={builder} />
        </div>
      </Panel>

      <Panel title="Evidence">
        {evidenceLoading ? (
          <p className="text-sm text-slate-400">Loading evidence...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Buyer Attachments</p>
              <div className="space-y-3">
                {buyerEvidence.length === 0 && <p className="text-sm text-slate-400">No buyer evidence uploaded.</p>}
                {buyerEvidence.map((file) => (
                  <div key={file.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                    <p className="font-bold text-slate-900 truncate">{file.file_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {file.uploaded_by_name} · {formatDateTime(file.created_at)} · {formatFileSize(file.file_size)}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {isPreviewable(file.file_type) && (
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-black uppercase tracking-widest text-blue-600">
                          Preview
                        </a>
                      )}
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" download className="text-xs font-black uppercase tracking-widest text-slate-600">
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Builder Attachments</p>
              <div className="space-y-3">
                {builderEvidence.length === 0 && <p className="text-sm text-slate-400">No builder evidence uploaded.</p>}
                {builderEvidence.map((file) => (
                  <div key={file.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                    <p className="font-bold text-slate-900 truncate">{file.file_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {file.uploaded_by_name} · {formatDateTime(file.created_at)} · {formatFileSize(file.file_size)}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {isPreviewable(file.file_type) && (
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-black uppercase tracking-widest text-blue-600">
                          Preview
                        </a>
                      )}
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" download className="text-xs font-black uppercase tracking-widest text-slate-600">
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Conversation">
        {conversationLoading ? (
          <p className="text-sm text-slate-400">Loading conversation...</p>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-sm text-slate-400">No messages in this project.</p>}
            {messages.map((message) => (
              <div key={message.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {message.sender_name} · {formatDateTime(message.created_at)}
                  {message.message_kind === 'system' ? ' · system' : ''}
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{message.body}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Founder Decision">
        {dispute.execution_pending && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-orange-700 mb-1">Execution Pending</p>
            <p className="text-sm text-orange-800">
              Decision recorded. Execute payment in Payments — this page does not move money.
            </p>
            <Link href={paymentsHref} className="inline-flex mt-3 text-xs font-black uppercase tracking-widest text-orange-700 hover:text-orange-900">
              Open Payments →
            </Link>
          </div>
        )}

        {!canEditDecision && dispute.decision_summary && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Recorded Decision</p>
            <p className="text-sm font-bold text-slate-900 mb-2">
              {DISPUTE_DECISION_LABELS[dispute.decision_type] || dispute.decision_type}
              {dispute.decision_type === 'split' &&
                ` · Buyer ${dispute.buyer_split_pct}% / Builder ${dispute.builder_split_pct}%`}
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{dispute.decision_summary}</p>
          </div>
        )}

        {canEditDecision && (
          <div className="space-y-4">
            <div className="space-y-2">
              {DISPUTE_DECISION_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="decisionType"
                    value={option.value}
                    checked={decisionType === option.value}
                    onChange={() => setDecisionType(option.value)}
                  />
                  <span className="text-sm font-bold text-slate-800">{option.label}</span>
                </label>
              ))}
            </div>

            {decisionType === 'split' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buyer %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={buyerSplitPct}
                    onChange={(e) => setBuyerSplitPct(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Builder %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={builderSplitPct}
                    onChange={(e) => setBuilderSplitPct(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                  />
                </div>
                <p className="sm:col-span-2 text-xs font-bold text-slate-500">Split total: {splitTotal}% (must equal 100)</p>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decision Summary</label>
              <textarea
                value={decisionSummary}
                onChange={(e) => setDecisionSummary(e.target.value)}
                rows={4}
                placeholder="Required rationale for the escrow decision..."
                className="mt-1 w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none"
              />
            </div>

            <button
              type="button"
              onClick={() => void saveDecision()}
              disabled={saving || !decisionType || !decisionSummary.trim() || (decisionType === 'split' && splitTotal !== 100)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Decision'}
            </button>
          </div>
        )}
      </Panel>

      <Panel title="Case History">
        {historyLoading ? (
          <p className="text-sm text-slate-400">Loading case history...</p>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {timeline.length === 0 && <p className="text-sm text-slate-400">No dispute events yet.</p>}
            {timeline.map((entry) => (
              <div key={entry.id} className="border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {entry.actor?.full_name || entry.actor_role} · {entry.entry_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">{formatDateTime(entry.created_at)}</p>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.description}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <InternalNotesPanel entityType="dispute" entityId={dispute.id} order="asc" />
    </div>
  );
}
