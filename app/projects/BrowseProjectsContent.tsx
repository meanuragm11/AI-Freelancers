'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ProjectCard } from '@/components/open-projects/ProjectCard';
import { ProjectCardSkeleton } from '@/components/open-projects/ProjectCard';
import { EmptyProjectsState, LoadingGrid } from '@/components/open-projects/EmptyStates';
import {
  CREATIVE_CATEGORIES,
  OTHER_CUSTOM_CATEGORY,
  PROFESSIONAL_CATEGORIES,
} from '@/lib/open-projects/categories';

export default function BrowseProjectsContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    params.set('limit', '24');

    try {
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setProjects(data.projects ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [q, category, sort]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">Open Projects</h1>
          <p className="text-slate-500 font-medium mb-6">Find AI projects posted by buyers worldwide. Submit proposals and get hired.</p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
              placeholder="Search projects…"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
              <option value="">All Categories</option>
              <optgroup label="Creative / Quick AI Tasks">
                {CREATIVE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Professional AI Services">
                {PROFESSIONAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Other">
                <option value={OTHER_CUSTOM_CATEGORY}>{OTHER_CUSTOM_CATEGORY}</option>
              </optgroup>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
              <option value="newest">Newest</option>
              <option value="budget_high">Highest Budget</option>
              <option value="budget_low">Lowest Budget</option>
              <option value="proposals">Most Proposals</option>
            </select>
            <button type="button" onClick={fetchProjects} className="bg-slate-900 text-white px-6 py-3 min-h-[44px] rounded-xl text-[10px] font-black uppercase tracking-widest w-full md:w-auto">Search</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{total} projects found</p>

        {loading ? (
          <LoadingGrid count={6} />
        ) : projects.length === 0 ? (
          <EmptyProjectsState variant="browse" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/projects/new" className="text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">Post your own project →</Link>
        </div>
      </div>
    </div>
  );
}
