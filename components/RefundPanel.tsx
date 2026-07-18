"use client";

import React, { useCallback, useEffect, useState } from 'react';

type UserRole = 'buyer' | 'builder';

type RefundTransaction = {
  id: string;
  amount_usd: number;
  transaction_type: string;
  created_at: string;
};

type RefundRequest = {
  id: string;
  collab_id: string;
  transaction_id: string;
  refund_type: string;
  requested_amount_usd: number;
  reason: string;
  status: string;
  builder_response?: string | null;
  builder_response_type?: 'accept' | 'contest' | null;
  founder_note?: string | null;
  failure_reason?: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested — Awaiting Builder',
  builder_responded: 'Builder Responded — Awaiting Founder',
  founder_review: 'Under Zelance Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing Refund',
  completed: 'Refund Completed',
  failed: 'Refund Failed',
  cancelled: 'Cancelled',
};

const REFUND_TYPES: [string, string][] = [
  ['full', 'Full Refund'],
  ['partial', 'Partial Refund'],
  ['milestone', 'Milestone Refund'],
  ['custom_settlement', 'Custom Settlement'],
];

export default function RefundPanel({
  collabId,
  userRole,
}: {
  collabId: string;
  userRole: UserRole;
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [eligibleTransactions, setEligibleTransactions] = useState<RefundTransaction[]>([]);

  const [txId, setTxId] = useState('');
  const [refundType, setRefundType] = useState('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [builderNote, setBuilderNote] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [refundsRes, txRes] = await Promise.all([
        fetch(`/api/refunds?collabId=${encodeURIComponent(collabId)}`),
        userRole === 'buyer'
          ? fetch(`/api/collabs/${encodeURIComponent(collabId)}/refundable-transactions`)
          : Promise.resolve(null),
      ]);
      const refundsData = await refundsRes.json();
      if (!refundsRes.ok) throw new Error(refundsData.error || 'Failed to load refund requests');
      setRefunds(refundsData.refunds ?? []);

      if (txRes) {
        const txData = await txRes.json();
        if (!txRes.ok) throw new Error(txData.error || 'Failed to load eligible payments');
        setEligibleTransactions(txData.transactions ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load refund data');
    } finally {
      setLoading(false);
    }
  }, [collabId, userRole]);

  useEffect(() => {
    void load();
  }, [load]);

  const requestRefund = async () => {
    if (!txId || !amount || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collabId,
          transactionId: txId,
          refundType,
          requestedAmountUsd: Number(amount),
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit refund request');
      setTxId('');
      setAmount('');
      setReason('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit refund request');
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async (refundId: string, responseType: 'accept' | 'contest') => {
    setRespondingId(refundId);
    setError(null);
    try {
      const res = await fetch(`/api/refunds/${refundId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseType, response: builderNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to respond');
      setBuilderNote('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to respond');
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 animate-pulse">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading refunds...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight">Refunds</h3>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
          {userRole === 'buyer'
            ? 'Request a refund for a captured payment. The builder can respond before founder review and approval.'
            : 'Respond to any refund requests raised against your captured payments. The founder makes the final call.'}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">{error}</div>
      )}

      {refunds.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-black text-slate-900">No refund requests</p>
        </div>
      )}

      {refunds.length > 0 && (
        <div className="space-y-3">
          {refunds.map((refund) => (
            <div key={refund.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-black text-slate-900">${Number(refund.requested_amount_usd).toLocaleString()}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 rounded-full px-3 py-1">
                  {STATUS_LABELS[refund.status] || refund.status}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                {refund.refund_type.replace(/_/g, ' ')}
              </p>
              <p className="text-xs font-medium text-slate-600 whitespace-pre-wrap">{refund.reason}</p>

              {refund.builder_response_type && (
                <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                    Builder {refund.builder_response_type === 'accept' ? 'Accepted' : 'Contested'}
                  </p>
                  {refund.builder_response && <p className="text-xs text-blue-900 mt-1">{refund.builder_response}</p>}
                </div>
              )}

              {refund.founder_note && (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Founder Note</p>
                  <p className="text-xs text-slate-700 mt-1">{refund.founder_note}</p>
                </div>
              )}

              {refund.failure_reason && (
                <p className="mt-2 text-xs font-bold text-rose-600">{refund.failure_reason}</p>
              )}

              {userRole === 'builder' && refund.status === 'requested' && !refund.builder_response_type && (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  <textarea
                    rows={2}
                    value={builderNote}
                    onChange={(e) => setBuilderNote(e.target.value)}
                    placeholder="Optional note to include with your response..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={respondingId === refund.id}
                      onClick={() => void respond(refund.id, 'accept')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Accept
                    </button>
                    <button
                      disabled={respondingId === refund.id}
                      onClick={() => void respond(refund.id, 'contest')}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Contest
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {userRole === 'buyer' && (
        <div className="space-y-3 border-t border-slate-100 pt-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Request a New Refund</p>
          {eligibleTransactions.length === 0 ? (
            <p className="text-xs text-slate-400">No captured payments are currently eligible for a refund request.</p>
          ) : (
            <>
              <select
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none"
              >
                <option value="">Select captured payment...</option>
                {eligibleTransactions.map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    ${Number(tx.amount_usd).toLocaleString()} · {tx.transaction_type} · {new Date(tx.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <select
                value={refundType}
                onChange={(e) => setRefundType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none"
              >
                {REFUND_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Refund amount (USD)"
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium outline-none"
              />
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you're requesting this refund..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none"
              />
              <button
                onClick={() => void requestRefund()}
                disabled={submitting || !txId || !amount || !reason.trim()}
                className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                {submitting ? 'Submitting...' : 'Request Refund'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
