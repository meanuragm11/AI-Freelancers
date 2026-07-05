"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';
import { DISPUTE_STATUS_LABELS } from '@/lib/founder/constants';

type Dispute = {
  id: string;
  status: string;
  primary_reason: string;
  created_at: string;
  buyer: { id: string; full_name: string | null } | null;
  freelancer: { id: string; full_name: string | null } | null;
  collab: { id: string; title: string; escrow_amount_usd: number; status: string } | null;
};

const STATUS_TONE: Record<string, 'amber' | 'purple' | 'blue' | 'rose' | 'green' | 'slate'> = {
  waiting_for_freelancer: 'amber',
  waiting_for_buyer: 'amber',
  negotiation: 'purple',
  under_review: 'blue',
  arbitration_requested: 'rose',
  resolved: 'green',
  closed: 'slate',
};

export default function FounderDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        const res = await fetch(`/api/founder/disputes?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load disputes');
        setDisputes(data.disputes ?? []);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load disputes');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [status]);

  return (
    <div>
      <SectionHeader
        eyebrow="Trust & Safety"
        title="Dispute Center"
        description="Every active and historical escrow dispute: evidence, timeline, and admin decisions."
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Statuses</option>
          {Object.entries(DISPUTE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Loading disputes...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">No disputes match these filters.</p>
            </div>
          ) : (
            disputes.map((dispute) => (
              <Link
                key={dispute.id}
                href={`/founder/disputes/${dispute.id}`}
                className="block bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge label={DISPUTE_STATUS_LABELS[dispute.status] || dispute.status} tone={STATUS_TONE[dispute.status] || 'slate'} />
                      <span className="text-xs font-bold text-slate-400">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 truncate">
                      {dispute.collab?.title || 'Untitled Project'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 truncate">{dispute.primary_reason}</p>
                    <p className="text-xs text-slate-400 font-medium mt-2">
                      Buyer: <span className="font-bold text-slate-600">{dispute.buyer?.full_name || 'Unknown'}</span>
                      {' · '}
                      Builder: <span className="font-bold text-slate-600">{dispute.freelancer?.full_name || 'Unknown'}</span>
                    </p>
                  </div>
                  <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl border border-rose-200 text-center min-w-[150px] shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-0.5">Escrow Amount</p>
                    <p className="text-xl font-black">${Number(dispute.collab?.escrow_amount_usd || 0).toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
