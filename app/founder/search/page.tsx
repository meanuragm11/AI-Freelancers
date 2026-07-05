"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';

type Result = {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_TONE: Record<string, 'blue' | 'rose' | 'amber' | 'green' | 'purple' | 'slate'> = {
  'Support Ticket': 'amber',
  User: 'blue',
  Transaction: 'green',
  'Escrow / Project': 'purple',
  Service: 'slate',
  'AI Asset': 'slate',
  Dispute: 'rose',
  'Refund Request': 'amber',
  Withdrawal: 'green',
};

function FounderSearchInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/founder/search?q=${encodeURIComponent(q)}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Search failed');
        setResults(payload.results);
      })
      .catch((searchError: unknown) => setError(searchError instanceof Error ? searchError.message : 'Search failed'))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div>
      <SectionHeader
        eyebrow="Platform-wide"
        title="Global Search"
        description="Search tickets, transactions, escrow/projects, users, services, AI assets, disputes, refunds, and withdrawals in one place."
      />

      {!q && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm font-medium text-slate-400">
          Use the search bar above to look up any ticket, transaction, escrow, user, email, service, AI asset, dispute, refund, or withdrawal.
        </div>
      )}

      {q && loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Searching for &ldquo;{q}&rdquo;...
        </div>
      )}

      {q && !loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {q && !loading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {results.length === 0 ? (
            <p className="p-10 text-center text-sm font-medium text-slate-400">No results found for &ldquo;{q}&rdquo;.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{result.title}</p>
                    <p className="text-xs text-slate-400 font-medium truncate">{result.subtitle}</p>
                  </div>
                  <Badge label={result.type} tone={TYPE_TONE[result.type] || 'slate'} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FounderSearchPage() {
  return (
    <Suspense fallback={null}>
      <FounderSearchInner />
    </Suspense>
  );
}
