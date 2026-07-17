'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { EmptyProjectsState } from '@/components/open-projects/EmptyStates';

function BuilderProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const res = await fetch('/api/builder/proposals', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load proposals');

      setProposals(data.proposals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposals');
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals, searchParams]);

  useEffect(() => {
    const refetchOnFocus = () => {
      if (document.visibilityState === 'visible') {
        void loadProposals();
      }
    };
    window.addEventListener('focus', refetchOnFocus);
    window.addEventListener('visibilitychange', refetchOnFocus);
    return () => {
      window.removeEventListener('focus', refetchOnFocus);
      window.removeEventListener('visibilitychange', refetchOnFocus);
    };
  }, [loadProposals]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <Link href="/builder/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-block">← Workspace</Link>
            <h1 className="text-3xl font-black text-slate-900">My Proposals</h1>
          </div>
          <Link href="/projects" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Browse Projects</Link>
        </div>

        {error && (
          <p className="mb-4 text-sm font-bold text-rose-600">{error}</p>
        )}

        {proposals.length === 0 ? (
          <EmptyProjectsState variant="builder" />
        ) : (
          <div className="space-y-4">
            {proposals.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <Link href={`/projects/${p.project_id}`} className="text-lg font-black text-slate-900 hover:text-blue-600">{p.project?.title ?? 'Project'}</Link>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{p.cover_letter}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400 mt-2">${Number(p.proposed_amount_usd).toLocaleString()} · {p.proposed_duration_days ?? '—'} days</p>
                </div>
                <span className={`self-start px-3 py-1 rounded-md text-[9px] font-black uppercase h-fit ${
                  p.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  p.status === 'rejected' ? 'bg-slate-100 text-slate-500' :
                  p.status === 'shortlisted' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuilderProposalsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading…</div>}>
      <BuilderProposalsContent />
    </Suspense>
  );
}
