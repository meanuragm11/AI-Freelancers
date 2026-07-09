'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProjectCard, ProjectCardSkeleton } from '@/components/open-projects/ProjectCard';
import { EmptyProjectsState } from '@/components/open-projects/EmptyStates';

export default function BuyerOpenProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/projects?mine=true')
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <Link href="/buyer/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-block">← Dashboard</Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Open Projects</h1>
          </div>
          <Link href="/projects/new" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md">Post a Project</Link>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'draft', 'published', 'hired', 'closed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest capitalize ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>{f}</button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <ProjectCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyProjectsState variant="buyer" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => router.push(`/buyer/open-projects/${p.id}`)} className="cursor-pointer relative">
                <ProjectCard project={p} />
                <span className={`absolute top-4 right-4 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                  p.status === 'published' ? 'bg-green-100 text-green-700' :
                  p.status === 'hired' ? 'bg-blue-100 text-blue-700' :
                  p.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
