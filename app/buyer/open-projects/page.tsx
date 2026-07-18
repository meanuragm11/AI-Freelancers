'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BuyerProjectCard, BuyerProjectCardSkeleton } from '@/components/open-projects/BuyerProjectCard';
import { EmptyProjectsState } from '@/components/open-projects/EmptyStates';
import { MarketplaceAlert } from '@/components/open-projects/MarketplaceAlert';

const PAGE_SIZE = 12;
const FILTERS = ['all', 'draft', 'published', 'archived', 'hired', 'closed'] as const;

export default function BuyerOpenProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [buyerLimitMessage, setBuyerLimitMessage] = useState<string | null>(null);
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mine: 'true',
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (filter !== 'all') params.set('status', filter);

      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setProjects(data.projects ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setProjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    fetch('/api/buyer/project-limits')
      .then((r) => r.json())
      .then((d) => {
        setBuyerLimitMessage(d.limits?.limitReached ? d.limits.reason : null);
        setIsVerifiedBuyer(Boolean(d.limits?.isVerifiedBuyer));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const handleClose = async (id: string) => {
    if (!confirm('Close this project to new proposals?')) return;
    await fetch(`/api/projects/${id}/close`, { method: 'POST' });
    void loadProjects();
  };

  const handleReopen = async (id: string) => {
    if (!confirm('Reopen this project to new proposals?')) return;
    await fetch(`/api/projects/${id}/reopen`, { method: 'POST' });
    void loadProjects();
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Restore this project to the public marketplace?')) return;
    const res = await fetch(`/api/projects/${id}/restore`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? 'Failed to restore project');
      return;
    }
    void loadProjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    void loadProjects();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <Link href="/buyer/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-block">← Dashboard</Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Open Projects</h1>
          </div>
          <Link href="/projects/new" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md">Post Project</Link>
        </div>

        {buyerLimitMessage && (
          <div className="mb-6">
            <MarketplaceAlert
              title="Temporary publishing limit"
              message={buyerLimitMessage}
              variant="warning"
            />
          </div>
        )}

        {isVerifiedBuyer && (
          <div className="mb-6">
            <MarketplaceAlert
              title="Verified Buyer"
              message="Unlimited publishing and higher visibility. Earned with 30+ day accounts, $100+ escrow spend, and completed contracts."
              variant="info"
            />
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest capitalize whitespace-nowrap ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              {f === 'published' ? 'open' : f === 'archived' ? 'archived' : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <BuyerProjectCardSkeleton key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <EmptyProjectsState variant="buyer" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => (
                <BuyerProjectCard
                  key={p.id}
                  project={p}
                  onClose={handleClose}
                  onReopen={handleReopen}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
