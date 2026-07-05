"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';
import { money } from '@/lib/founder/utils';

type Tab = 'transactions' | 'escrow' | 'withdrawals' | 'refunds';

const TABS: { id: Tab; label: string }[] = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'escrow', label: 'Escrow / Projects' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'refunds', label: 'Refunds' },
];

const STATUS_TONE: Record<string, 'green' | 'amber' | 'rose' | 'slate' | 'blue'> = {
  completed: 'green',
  approved: 'green',
  pending: 'amber',
  requested: 'amber',
  pending_review: 'amber',
  processing: 'amber',
  rejected: 'rose',
  expired: 'slate',
  failed: 'rose',
  cancelled: 'slate',
  funded: 'blue',
  in_progress: 'blue',
  active: 'blue',
  disputed: 'rose',
  builder_responded: 'blue',
  founder_review: 'amber',
};

const VALID_TABS: Tab[] = ['transactions', 'escrow', 'withdrawals', 'refunds'];

function PaymentCenterInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'transactions');
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (tab === 'refunds') {
        const res = await fetch(`/api/founder/refunds?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load refunds');
        setRows(data.refunds || []);
        return;
      }
      params.set('tab', tab);
      const res = await fetch(`/api/founder/payments?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payments');
      setRows(data.transactions || data.escrow || data.withdrawals || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const decideRefund = async (id: string, action: 'approve' | 'reject' | 'retry', extra?: { amountUsd?: number; note?: string }) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/founder/refunds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await load();
    } catch (updateError: unknown) {
      alert(updateError instanceof Error ? updateError.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateWithdrawalStatus = async (
    id: string,
    status: string,
    extra?: { rejectionReason?: string; failureReason?: string }
  ) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/founder/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await load();
    } catch (updateError: unknown) {
      alert(updateError instanceof Error ? updateError.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    setRows([]);
    const timeout = setTimeout(() => void load(), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q]);

  return (
    <div>
      <SectionHeader
        eyebrow="Finance"
        title="Payment Center"
        description="Search transactions, escrow, withdrawals, and refunds by ID, user, service, or project."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by transaction ID, escrow ID, user name, order ID, or reference code..."
          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
        />
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Searching...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {tab === 'transactions' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Buyer</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                    <th className="px-5 py-4 text-right">Platform Fee</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No transactions found.</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-500">{row.order_id}</td>
                      <td className="px-5 py-4">
                        <Link href={`/founder/users/${row.buyer_id}`} className="font-bold text-slate-900 hover:text-blue-600">
                          {row.buyer?.full_name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium capitalize">{(row.transaction_type ?? 'unknown').replace(/_/g, ' ')}</td>
                      <td className="px-5 py-4 text-right font-black text-slate-900">{money(row.amount_usd)}</td>
                      <td className="px-5 py-4 text-right font-bold text-green-600">{money(row.fee_usd)}</td>
                      <td className="px-5 py-4"><Badge label={row.status} tone={STATUS_TONE[row.status] || 'slate'} /></td>
                      <td className="px-5 py-4 text-slate-400 font-medium">{new Date(row.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'escrow' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4">Project</th>
                    <th className="px-5 py-4">Buyer</th>
                    <th className="px-5 py-4">Builder</th>
                    <th className="px-5 py-4 text-right">Escrow</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No projects found.</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">{row.title}</td>
                      <td className="px-5 py-4">
                        <Link href={`/founder/users/${row.buyer_id}`} className="text-slate-700 hover:text-blue-600 font-medium">
                          {row.buyer?.full_name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/founder/users/${row.builder_id}`} className="text-slate-700 hover:text-blue-600 font-medium">
                          {row.builder?.full_name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-slate-900">{money(row.escrow_amount_usd)}</td>
                      <td className="px-5 py-4"><Badge label={row.status} tone={STATUS_TONE[row.status] || 'slate'} /></td>
                      <td className="px-5 py-4 text-slate-400 font-medium">{new Date(row.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'withdrawals' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4">Reference</th>
                    <th className="px-5 py-4">Builder</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Requested</th>
                    <th className="px-5 py-4">Failure Reason</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No withdrawals found.</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-500">{row.reference_code}</td>
                      <td className="px-5 py-4">
                        <Link href={`/founder/users/${row.builder_id}`} className="font-bold text-slate-900 hover:text-blue-600">
                          {row.builder?.full_name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-slate-900">{money(row.amount_usd)}</td>
                      <td className="px-5 py-4"><Badge label={row.status} tone={STATUS_TONE[row.status] || 'slate'} /></td>
                      <td className="px-5 py-4 text-slate-400 font-medium">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-rose-500 font-medium">{row.failure_reason || row.rejection_reason || '—'}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {row.status === 'requested' && (
                            <button
                              disabled={updatingId === row.id}
                              onClick={() => void updateWithdrawalStatus(row.id, 'pending_review')}
                              className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                            >
                              Review
                            </button>
                          )}
                          {['requested', 'pending_review'].includes(row.status) && (
                            <>
                              <button
                                disabled={updatingId === row.id}
                                onClick={() => void updateWithdrawalStatus(row.id, 'approved')}
                                className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                disabled={updatingId === row.id}
                                onClick={() => {
                                  const reason = window.prompt('Rejection reason (optional):') ?? undefined;
                                  void updateWithdrawalStatus(row.id, 'rejected', { rejectionReason: reason });
                                }}
                                className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {row.status === 'approved' && (
                            <button
                              disabled={updatingId === row.id}
                              onClick={() => void updateWithdrawalStatus(row.id, 'processing')}
                              className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              Process
                            </button>
                          )}
                          {row.status === 'processing' && (
                            <>
                              <button
                                disabled={updatingId === row.id}
                                onClick={() => void updateWithdrawalStatus(row.id, 'completed')}
                                className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                Complete
                              </button>
                              <button
                                disabled={updatingId === row.id}
                                onClick={() => {
                                  const reason = window.prompt('Failure reason (optional):') ?? undefined;
                                  void updateWithdrawalStatus(row.id, 'failed', { failureReason: reason });
                                }}
                                className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              >
                                Fail
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'refunds' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4">Project</th>
                    <th className="px-5 py-4">Buyer</th>
                    <th className="px-5 py-4">Builder</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4 text-right">Requested</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Builder Response</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No refund requests found.</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/founder/payments?tab=escrow&q=${row.collab_id}`} className="font-bold text-slate-900 hover:text-blue-600">
                          {row.collab?.title || 'Untitled Project'}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/founder/users/${row.buyer_id}`} className="text-slate-700 hover:text-blue-600 font-medium">
                          {row.buyer?.full_name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/founder/users/${row.builder_id}`} className="text-slate-700 hover:text-blue-600 font-medium">
                          {row.builder?.full_name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-medium capitalize">{row.refund_type?.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-4 text-right font-black text-slate-900">{money(row.requested_amount_usd)}</td>
                      <td className="px-5 py-4"><Badge label={row.status} tone={STATUS_TONE[row.status] || 'slate'} /></td>
                      <td className="px-5 py-4 text-slate-500 font-medium max-w-xs truncate">
                        {row.builder_response_type ? (
                          <span className={row.builder_response_type === 'accept' ? 'text-emerald-600' : 'text-rose-600'}>
                            {row.builder_response_type === 'accept' ? 'Accepted' : 'Contested'}
                            {row.builder_response ? `: ${row.builder_response}` : ''}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {['requested', 'builder_responded', 'founder_review'].includes(row.status) && (
                            <>
                              <button
                                disabled={updatingId === row.id}
                                onClick={() => void decideRefund(row.id, 'approve')}
                                className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                disabled={updatingId === row.id}
                                onClick={() => {
                                  const note = window.prompt('Rejection note (optional):') ?? undefined;
                                  void decideRefund(row.id, 'reject', { note });
                                }}
                                className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {row.status === 'failed' && (
                            <button
                              disabled={updatingId === row.id}
                              onClick={() => void decideRefund(row.id, 'retry')}
                              className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                        {row.status === 'failed' && row.failure_reason && (
                          <p className="text-[10px] text-rose-500 font-medium mt-1 max-w-[160px] truncate">{row.failure_reason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'refunds' && (
        <p className="text-xs text-slate-400 font-medium mt-4">
          Approving a request calls the Razorpay refund API immediately for the exact captured payment.
          Builder responses are informational only — founder approval is always required before money moves.
        </p>
      )}
    </div>
  );
}

export default function FounderPaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCenterInner />
    </Suspense>
  );
}
