"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Image from '@/components/RemoteImage';

import { supabase } from '@/lib/supabaseClient';
import { uploadMarketplaceFile } from '@/lib/storage/upload';

type UserRole = 'buyer' | 'builder';

type EvidenceFile = {
  name: string;
  url: string;
  type?: string;
  size?: number;
};

type Dispute = {
  id: string;
  collab_id: string;
  status: string;
  primary_reason: string;
  detailed_explanation: string;
  event_timeline: string;
  freelancer_response?: string | null;
  freelancer_resolution_proposal?: string | null;
  escrow_frozen_at?: string | null;
  created_at: string;
};

type TimelineEntry = {
  id: string;
  entry_type: string;
  description: string;
  actor_role: string;
  created_at: string;
  files?: EvidenceFile[] | null;
  actor?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

interface DisputeCenterProps {
  collabId: string;
  currentUser: { id: string };
  userRole: UserRole;
  onDisputeChanged?: (isActive: boolean) => void;
  /** When true, buyer can open a new dispute inline (modal or dedicated tab). */
  showOpenDisputeForm?: boolean;
  /** embedded = no outer card chrome (sidebar/modal host provides it) */
  variant?: 'panel' | 'embedded';
  /** Called after buyer successfully opens a dispute (e.g. close modal). */
  onDisputeOpened?: () => void;
}

import {
  DISPUTE_STATUS_LABELS,
  isActiveDisputeStatus,
} from '@/lib/disputes/constants';

const DISPUTE_REASONS = [
  ['quality', 'Deliverable does not meet technical requirements'],
  ['timeline', 'Critical milestone deadline was missed'],
  ['communication', 'Unresponsive or insufficient communication'],
  ['scope', 'Scope or acceptance criteria disagreement'],
  ['payment', 'Payment, escrow, or release disagreement'],
  ['other', 'Other issue'],
];

function formatStatus(status?: string) {
  if (!status) return 'No Active Dispute';
  return DISPUTE_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

function formatFileSize(size?: number) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`;
}

function EvidencePreview({ file }: { file: EvidenceFile }) {
  const isImage = file.type?.startsWith('image/');

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
        {isImage ? (
          <Image src={file.url} alt={file.name} fill sizes="48px" className="object-cover" />
        ) : (
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v16z" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-black text-slate-800">{file.name}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          {file.type || 'Attachment'} {formatFileSize(file.size)}
        </p>
      </div>
    </a>
  );
}

export default function DisputeCenter({
  collabId,
  currentUser,
  userRole,
  onDisputeChanged,
  showOpenDisputeForm = false,
  variant = 'panel',
  onDisputeOpened,
}: DisputeCenterProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState({
    primaryReason: '',
    detailedExplanation: '',
    eventTimeline: '',
  });
  const [response, setResponse] = useState('');
  const [comment, setComment] = useState('');
  const [proposal, setProposal] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const fetchDispute = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch(`/api/disputes?collabId=${encodeURIComponent(collabId)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const requestId = typeof data.requestId === 'string' ? ` Reference: ${data.requestId}` : '';
        throw new Error(`${data.error || 'Failed to load dispute state'}${requestId}`);
      }

      setDispute(data.dispute);
      setTimeline(data.timeline || []);
      onDisputeChanged?.(Boolean(data.dispute && isActiveDisputeStatus(data.dispute.status)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dispute state');
    } finally {
      setLoading(false);
    }
  }, [collabId, onDisputeChanged]);

  useEffect(() => {
    void Promise.resolve().then(fetchDispute);

    const channel = supabase
      .channel(`dispute_center_${collabId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disputes', filter: `collab_id=eq.${collabId}` },
        () => fetchDispute()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dispute_timeline_entries', filter: `collab_id=eq.${collabId}` },
        () => fetchDispute()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collabId, fetchDispute]);

  async function uploadSelectedEvidence() {
    const uploaded: EvidenceFile[] = [];

    for (const file of selectedFiles) {
      const url = await uploadMarketplaceFile(currentUser.id, `disputes/${collabId}`, file);
      uploaded.push({
        name: file.name,
        url,
        type: file.type || 'application/octet-stream',
        size: file.size,
      });
    }

    return uploaded;
  }

  async function submitRequest(payload: Record<string, unknown>, method: 'POST' | 'PATCH' = 'PATCH') {
    setSubmitting(true);
    setError(null);

    try {
      const files = await uploadSelectedEvidence();
      const res = await fetch('/api/disputes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collabId, files, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dispute action failed');

      setSelectedFiles([]);
      setComment('');
      setResponse('');
      setProposal('');
      if (method === 'POST') {
        onDisputeOpened?.();
      }
      await fetchDispute();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dispute action failed');
    } finally {
      setSubmitting(false);
    }
  }

  const hasActiveDispute = Boolean(dispute && isActiveDisputeStatus(dispute.status));
  const isBuyer = userRole === 'buyer';
  const isBuilder = userRole === 'builder';
  const canRespond = isBuilder && dispute?.status === 'open' && !dispute.freelancer_response;
  const canNegotiate = Boolean(dispute && isActiveDisputeStatus(dispute.status) && dispute.status !== 'waiting_for_payment_execution');

  const shellClass =
    variant === 'embedded'
      ? 'h-full flex flex-col overflow-hidden font-sans'
      : 'bg-white border border-slate-200 rounded-3xl shadow-sm h-full flex flex-col overflow-hidden font-sans';

  if (loading) {
    return (
      <div className={variant === 'embedded' ? 'p-6 animate-pulse' : 'bg-white border border-slate-200 rounded-3xl shadow-sm p-6 animate-pulse'}>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Dispute Center...</p>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {variant === 'panel' && (
      <div className="border-b border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Dispute Center</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Exceptional workflow. Messaging remains the primary workspace.
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${
            error
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : hasActiveDispute
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {error && !dispute ? 'Unavailable' : formatStatus(dispute?.status)}
          </span>
        </div>
      </div>
      )}

      <div className={`flex-1 overflow-y-auto custom-scrollbar space-y-6 ${variant === 'embedded' ? 'p-6' : 'p-5'}`}>
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        {!dispute && !error && isBuyer && showOpenDisputeForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitRequest(openForm, 'POST');
            }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Before Opening</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-amber-800">
                Opening a dispute freezes escrow and pauses releases, approvals, completion, cancellation, and reviews.
              </p>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Primary Reason</label>
              <select
                required
                value={openForm.primaryReason}
                onChange={(e) => setOpenForm({ ...openForm, primaryReason: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none"
              >
                <option value="">Select reason...</option>
                {DISPUTE_REASONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Detailed Explanation</label>
              <textarea
                required
                rows={5}
                value={openForm.detailedExplanation}
                onChange={(e) => setOpenForm({ ...openForm, detailedExplanation: e.target.value })}
                placeholder="Explain what happened, what was expected, and what remains unresolved."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Timeline of Events</label>
              <textarea
                required
                rows={4}
                value={openForm.eventTimeline}
                onChange={(e) => setOpenForm({ ...openForm, eventTimeline: e.target.value })}
                placeholder="Add dates, milestones, messages, and delivery checkpoints."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <EvidenceInput selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} />

            <button
              type="submit"
              disabled={submitting || !openForm.primaryReason || !openForm.detailedExplanation.trim() || !openForm.eventTimeline.trim()}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
            >
              {submitting ? 'Freezing Escrow...' : 'Open Dispute & Freeze Escrow'}
            </button>
          </form>
        )}

        {!dispute && !error && !showOpenDisputeForm && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-black text-slate-900">No active dispute</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {isBuyer
                ? 'If you need to escalate an issue, use Raise Dispute on a submitted milestone.'
                : 'If a buyer opens one, your response tools and evidence timeline will appear here.'}
            </p>
          </div>
        )}

        {dispute && (
          <>
            <section className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Escrow Protection Active</p>
              <h4 className="mt-1 text-base font-black text-rose-950">{formatStatus(dispute.status)}</h4>
              <p className="mt-2 text-xs font-medium leading-relaxed text-rose-800">
                Escrow is frozen. Milestone releases, funding, approvals, project completion, cancellation, reviews, and payment finalization are disabled while this dispute is active.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Buyer Complaint</p>
              <h4 className="mt-2 text-sm font-black text-slate-900">{formatStatus(dispute.primary_reason)}</h4>
              <p className="mt-3 whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-700">{dispute.detailed_explanation}</p>
              <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Submitted Timeline</p>
                <p className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-600">{dispute.event_timeline}</p>
              </div>
            </section>

            {dispute.freelancer_response && (
              <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Freelancer Response</p>
                <p className="mt-3 whitespace-pre-wrap text-xs font-medium leading-relaxed text-blue-950">{dispute.freelancer_response}</p>
              </section>
            )}

            {canRespond && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitRequest({ action: 'respond', response });
                }}
                className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-5"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Freelancer Response Required</p>
                <textarea
                  required
                  rows={5}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Submit your explanation, understanding of the issue, and supporting context. This response is immutable."
                  className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
                />
                <EvidenceInput selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} />
                <button
                  disabled={submitting || !response.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {submitting ? 'Submitting...' : 'Submit Immutable Response'}
                </button>
              </form>
            )}

            {canNegotiate && (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Add Comment or Evidence</p>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add an update for the permanent dispute history."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
                />
                <EvidenceInput selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} />
                <button
                  type="button"
                  onClick={() => void submitRequest({ action: 'comment', comment })}
                  disabled={submitting || (!comment.trim() && selectedFiles.length === 0)}
                  className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {submitting ? 'Adding...' : 'Add to Timeline'}
                </button>
              </section>
            )}

            {isBuilder && hasActiveDispute && (
              <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Propose Resolution</p>
                <textarea
                  rows={3}
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  placeholder="Accept responsibility, offer a fix, partial refund, revised delivery date, or another resolution."
                  className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => void submitRequest({ action: 'propose_resolution', proposal })}
                  disabled={submitting || !proposal.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Propose Resolution
                </button>
              </section>
            )}

            {hasActiveDispute && isBuyer && (
              <button
                type="button"
                onClick={() => void submitRequest({ action: 'withdraw', comment: 'Buyer withdrew the dispute after reaching satisfaction.' })}
                disabled={submitting}
                className="w-full bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Withdraw Dispute
              </button>
            )}

            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-slate-900">Audit Timeline</h4>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{timeline.length} entries</span>
              </div>
              <div className="space-y-3">
                {timeline.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {entry.actor?.full_name || entry.actor_role} · {entry.entry_type.replace(/_/g, ' ')}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">{entry.description}</p>
                      </div>
                      <time className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </time>
                    </div>
                    {entry.files && entry.files.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {entry.files.map((file) => (
                          <EvidencePreview key={`${entry.id}-${file.url}`} file={file} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function EvidenceInput({
  selectedFiles,
  setSelectedFiles,
}: {
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
}) {
  return (
    <div>
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
        Supporting Evidence
      </label>
      <input
        type="file"
        multiple
        onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
        className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-white"
      />
      {selectedFiles.length > 0 && (
        <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
          </p>
          <div className="space-y-1">
            {selectedFiles.map((file) => (
              <p key={`${file.name}-${file.size}`} className="truncate text-xs font-medium text-slate-600">
                {file.name} {formatFileSize(file.size)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
