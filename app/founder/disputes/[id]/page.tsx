"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Badge from '@/components/founder/Badge';
import InternalNotesPanel from '@/components/founder/InternalNotesPanel';
import BusinessTimeline from '@/components/founder/BusinessTimeline';
import { DISPUTE_STATUS_LABELS } from '@/lib/founder/constants';

export default function FounderDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const disputeId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispute, setDispute] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [refundableTransactions, setRefundableTransactions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [resolutionType, setResolutionType] = useState('');

  const [refundTxId, setRefundTxId] = useState('');
  const [refundType, setRefundType] = useState('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [filingRefund, setFilingRefund] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/founder/disputes/${disputeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dispute');
      setDispute(data.dispute);
      setTimeline(data.timeline ?? []);
      setEvidence(data.evidence ?? []);
      setMessages(data.messages ?? []);
      setRefunds(data.refunds ?? []);
      setRefundableTransactions(data.refundableTransactions ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dispute');
    } finally {
      setLoading(false);
    }
  };

  const fileRefund = async () => {
    if (!refundTxId || !refundAmount || !refundReason.trim()) return;
    setFilingRefund(true);
    setError(null);
    try {
      const res = await fetch('/api/founder/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collabId: dispute.collab_id,
          transactionId: refundTxId,
          refundType,
          requestedAmountUsd: Number(refundAmount),
          reason: refundReason,
          disputeId: dispute.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to file refund');
      setRefundTxId('');
      setRefundAmount('');
      setRefundReason('');
      await load();
    } catch (refundError: unknown) {
      setError(refundError instanceof Error ? refundError.message : 'Failed to file refund');
    } finally {
      setFilingRefund(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  const applyDecision = async (status?: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/founder/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolutionType: resolutionType || undefined,
          resolutionSummary: decisionNote || undefined,
          decisionNote: decisionNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update dispute');
      setDispute(data.dispute);
      setDecisionNote('');
      await load();
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update dispute');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-xs font-black uppercase tracking-widest text-slate-400">Loading dispute...</div>;
  }

  if (error && !dispute) {
    return <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>;
  }

  if (!dispute) return null;

  const isOpen = !['resolved', 'closed'].includes(dispute.status);

  return (
    <div className="space-y-6">
      <Link href="/founder/disputes" className="inline-flex text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
        ← Back to Disputes
      </Link>

      <div className="bg-white border-2 border-rose-100 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge label={DISPUTE_STATUS_LABELS[dispute.status] || dispute.status} tone="rose" />
              <span className="text-xs font-bold text-slate-400">
                Opened {new Date(dispute.created_at).toLocaleString()}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">{dispute.collab?.title || 'Untitled Project'}</h1>
            <p className="text-sm text-slate-500 mt-1">{dispute.primary_reason}</p>
          </div>
          <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl border border-rose-200 text-center min-w-[150px]">
            <p className="text-[9px] font-black uppercase tracking-widest mb-0.5">Frozen Escrow</p>
            <p className="text-2xl font-black">${Number(dispute.collab?.escrow_amount_usd || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Buyer</p>
            <Link href={`/founder/users/${dispute.buyer?.id}`} className="font-black text-slate-900 hover:text-blue-600">
              {dispute.buyer?.full_name || 'Unknown'}
            </Link>
            {dispute.buyer?.is_verified && <Badge label="Verified" tone="green" />}
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Builder</p>
            <Link href={`/founder/users/${dispute.freelancer?.id}`} className="font-black text-slate-900 hover:text-blue-600">
              {dispute.freelancer?.full_name || 'Unknown'}
            </Link>
            {dispute.freelancer?.is_verified && <Badge label="Verified" tone="green" />}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Detailed Explanation</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{dispute.detailed_explanation}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Event Timeline (Reported)</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{dispute.event_timeline}</p>
          </div>
          {dispute.freelancer_response && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Freelancer Response</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{dispute.freelancer_response}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Timeline & Evidence</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {timeline.length === 0 && <p className="text-sm text-slate-400">No timeline entries.</p>}
              {timeline.map((entry: any) => (
                <div key={entry.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {entry.actor_role} {entry.actor?.full_name ? `· ${entry.actor.full_name}` : ''}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-slate-700">{entry.description}</p>
                  {Array.isArray(entry.files) && entry.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {entry.files.map((file: any, idx: number) => (
                        <a
                          key={idx}
                          href={file.url || file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                        >
                          {file.name || file.file_name || 'Attachment'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {evidence.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Evidence Files</p>
                <div className="flex flex-wrap gap-2">
                  {evidence.map((file: any) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"
                    >
                      {file.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Project Conversation</h3>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {messages.length === 0 && <p className="text-sm text-slate-400">No messages in this project.</p>}
              {messages.map((message: any) => (
                <div key={message.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">
                    {new Date(message.created_at).toLocaleString()}
                    {message.message_kind === 'system' && ' · system'}
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{message.text || message.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Admin Decision</h3>
            {!isOpen && (
              <div className="mb-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Resolved</p>
                <p className="text-sm text-slate-700">{dispute.resolution_summary || 'No summary provided.'}</p>
              </div>
            )}
            {isOpen && (
              <div className="space-y-3">
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
                >
                  <option value="">Resolution Type...</option>
                  <option value="buyer_favor">Favor Buyer (Refund)</option>
                  <option value="freelancer_favor">Favor Builder (Release)</option>
                  <option value="split">Split Escrow</option>
                  <option value="other">Other</option>
                </select>
                <textarea
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={4}
                  placeholder="Internal decision rationale / resolution summary..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none"
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => applyDecision()}
                    disabled={saving || !decisionNote.trim()}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                  >
                    Log Note Only
                  </button>
                  <button
                    onClick={() => applyDecision('resolved')}
                    disabled={saving || !resolutionType}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => applyDecision('closed')}
                    disabled={saving}
                    className="w-full bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50"
                  >
                    Close Dispute
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Refunds</h3>

            {refunds.length > 0 && (
              <div className="space-y-2 mb-4">
                {refunds.map((refund: any) => (
                  <div key={refund.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-slate-900">${Number(refund.requested_amount_usd).toLocaleString()}</span>
                      <Badge label={refund.status} tone={refund.status === 'completed' ? 'green' : refund.status === 'rejected' || refund.status === 'failed' ? 'rose' : 'amber'} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{refund.refund_type?.replace(/_/g, ' ')}</p>
                    {refund.failure_reason && <p className="text-xs text-rose-500 mt-1">{refund.failure_reason}</p>}
                  </div>
                ))}
                <Link href="/founder/payments?tab=refunds" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Manage in Payments → Refunds
                </Link>
              </div>
            )}

            {refunds.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  File a refund request for the buyer using a captured payment. It will require separate approval
                  from Payments → Refunds before Razorpay is called.
                </p>
                <select
                  value={refundTxId}
                  onChange={(e) => setRefundTxId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
                >
                  <option value="">Select captured payment...</option>
                  {refundableTransactions.map((tx: any) => (
                    <option key={tx.id} value={tx.id}>
                      ${Number(tx.amount_usd).toLocaleString()} · {tx.transaction_type} · {new Date(tx.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <select
                  value={refundType}
                  onChange={(e) => setRefundType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
                >
                  <option value="full">Full Refund</option>
                  <option value="partial">Partial Refund</option>
                  <option value="milestone">Milestone Refund</option>
                  <option value="custom_settlement">Custom Settlement</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Refund amount (USD)"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
                />
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for refund..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium outline-none resize-none"
                />
                <button
                  onClick={() => void fileRefund()}
                  disabled={filingRefund || !refundTxId || !refundAmount || !refundReason.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50"
                >
                  {filingRefund ? 'Filing...' : 'File Refund Request'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Case Timeline</h3>
            <BusinessTimeline collabId={dispute.collab_id} />
          </div>

          <InternalNotesPanel entityType="dispute" entityId={dispute.id} />
        </div>
      </div>
    </div>
  );
}
