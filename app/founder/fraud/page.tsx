"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';
import { money } from '@/lib/founder/utils';

function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</h3>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${count > 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
          {count} flagged
        </span>
      </div>
      {children}
    </div>
  );
}

export default function FounderFraudPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/founder/fraud');
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load fraud signals');
        setData(payload);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load fraud signals');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div>
      <SectionHeader
        eyebrow="Trust & Safety"
        title="Fraud & Risk"
        description="Heuristic signals computed from live marketplace data: duplicate accounts, suspicious payments, and repeated dispute/refund activity."
      />

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Scanning for risk signals...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Duplicate Accounts (Same Email)" count={data.duplicateAccounts.length}>
            {data.duplicateAccounts.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-4 text-center">No duplicate accounts detected.</p>
            ) : (
              <div className="space-y-2">
                {data.duplicateAccounts.map((entry: any) => (
                  <div key={entry.email} className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-xs font-mono font-bold text-rose-700 mb-1">{entry.email}</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.accounts.map((acc: any) => (
                        <Link key={acc.id} href={`/founder/users/${acc.id}`} className="text-xs font-bold text-slate-700 hover:text-blue-600 underline">
                          {acc.fullName || acc.id.slice(0, 8)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Excessive Disputes" count={data.excessiveDisputes.length}>
            {data.excessiveDisputes.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-4 text-center">No user has an unusual dispute count.</p>
            ) : (
              <div className="space-y-2">
                {data.excessiveDisputes.map((entry: any) => (
                  <Link key={entry.userId} href={`/founder/users/${entry.userId}`} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-rose-200 transition-colors">
                    <span className="font-bold text-slate-900">{entry.name || entry.userId.slice(0, 8)}</span>
                    <Badge label={`${entry.count} disputes (${entry.role})`} tone="rose" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Suspicious High-Value Payments" count={data.suspiciousPayments.length}>
            {data.suspiciousPayments.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-4 text-center">No transactions above ${data.thresholds.suspiciousTransactionUsd}.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {data.suspiciousPayments.map((t: any) => (
                  <Link key={t.id} href={`/founder/payments?q=${t.id}`} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{t.buyer?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400 font-mono">{t.order_id}</p>
                    </div>
                    <span className="font-black text-slate-900">{money(t.amount_usd)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Failed / Expired Payments" count={data.failedPayments.length}>
            {data.failedPayments.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-4 text-center">No failed payments recorded.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {data.failedPayments.map((t: any) => (
                  <Link key={t.id} href={`/founder/payments?q=${t.id}`} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors">
                    <span className="font-bold text-slate-900">{t.buyer?.full_name || 'Unknown'}</span>
                    <Badge label={t.status} tone="amber" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Excessive Refunds Against a Builder" count={data.excessiveRefunds.length}>
            {data.excessiveRefunds.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-4 text-center">No builder has repeated buyer-favor resolutions.</p>
            ) : (
              <div className="space-y-2">
                {data.excessiveRefunds.map((entry: any) => (
                  <Link key={entry.builderId} href={`/founder/users/${entry.builderId}`} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-rose-200 transition-colors">
                    <span className="font-bold text-slate-900">{entry.name || entry.builderId.slice(0, 8)}</span>
                    <Badge label={`${entry.count} refunds`} tone="rose" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
