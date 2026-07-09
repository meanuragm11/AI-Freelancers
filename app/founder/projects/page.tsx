'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/founder/Badge';
import SectionHeader from '@/components/founder/SectionHeader';

export default function FounderProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : '';
    const [projRes, repRes] = await Promise.all([
      fetch(`/api/founder/projects${params}`),
      fetch('/api/founder/projects/reports'),
    ]);
    const projData = await projRes.json();
    const repData = await repRes.json();
    setProjects(projData.projects ?? []);
    setStatusCounts(projData.statusCounts ?? {});
    setReports(repData.reports ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [filter]);

  const moderate = async (projectId: string, action: string) => {
    await fetch('/api/founder/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, action }),
    });
    void load();
  };

  const reviewReport = async (reportId: string, status: string) => {
    await fetch('/api/founder/projects/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, status }),
    });
    void load();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <SectionHeader eyebrow="Marketplace" title="Open Projects" description="Moderate public project listings and content reports" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button key={status} type="button" onClick={() => setFilter(status === filter ? '' : status)} className={`bg-white rounded-xl p-4 border text-left ${filter === status ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
            <p className="text-[10px] font-black uppercase text-slate-400">{status}</p>
            <p className="text-2xl font-black text-slate-900">{count}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Projects</h3>
          {loading ? (
            <p className="text-xs font-bold text-slate-400 animate-pulse">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-slate-400">No projects match filter.</p>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex justify-between gap-4 mb-2">
                  <div>
                    <p className="font-black text-slate-900">{p.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{p.buyer?.full_name} · {p.status}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {p.is_featured ? <Badge label="Featured" tone="amber" /> : null}
                    <Badge label={`${p.proposal_count} proposals`} tone={p.status === 'published' ? 'green' : 'slate'} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description}</p>
                <div className="flex flex-wrap gap-2">
                  {!p.is_featured && p.status === 'published' && (
                    <button type="button" onClick={() => moderate(p.id, 'feature')} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase">Feature</button>
                  )}
                  {p.is_featured && (
                    <button type="button" onClick={() => moderate(p.id, 'unfeature')} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">Unfeature</button>
                  )}
                  {!p.deleted_at && (
                    <button type="button" onClick={() => moderate(p.id, 'remove')} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black uppercase">Remove</button>
                  )}
                  <Link href={`/projects/${p.id}`} className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500">View</Link>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Pending Reports ({reports.length})</h3>
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-rose-600">{r.entity_type}</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{r.reason}</p>
                <p className="text-[10px] text-slate-400 mt-1">by {r.reporter?.full_name ?? 'User'}</p>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => reviewReport(r.id, 'actioned')} className="text-[10px] font-black uppercase text-green-600">Action</button>
                  <button type="button" onClick={() => reviewReport(r.id, 'dismissed')} className="text-[10px] font-black uppercase text-slate-400">Dismiss</button>
                </div>
              </div>
            ))}
            {reports.length === 0 && <p className="text-sm text-slate-400">No pending reports.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
