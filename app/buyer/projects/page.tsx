"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

type ProjectStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export default function BuyerProjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [filter, setFilter] = useState<ProjectStatusFilter>('all');

  useEffect(() => {
    async function fetchProjects() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data, error } = await supabase
        .from('collabs')
        .select('*, profiles_public!builder_id(full_name, avatar_url, headline)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setProjects(data);
      setLoading(false);
    }
    fetchProjects();
  }, [router]);

  const filteredProjects = projects.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'active') return p.status === 'in_progress' || p.status === 'funded';
    if (filter === 'completed') return p.status === 'completed';
    return p.status === filter;
  });

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase tracking-widest text-slate-400 text-xs animate-pulse">Loading Project Ledger...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <Link href="/buyer/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Services</h1>
          </div>
          <Link href="/buyer/discover" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors flex items-center gap-2">
             Start New Project
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {['all', 'active', 'completed', 'cancelled'].map((f) => (
            <button 
              key={f} 
              onClick={() => setFilter(f as ProjectStatusFilter)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all capitalize ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
            >
              {f} {f === 'all' ? `(${projects.length})` : ''}
            </button>
          ))}
        </div>

        {/* Project Grid */}
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">No projects found</p>
              <p className="text-xs font-medium text-slate-500">You do not have any projects matching this status.</p>
            </div>
          ) : (
            filteredProjects.map(project => (
              <div key={project.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center gap-6 group cursor-pointer" onClick={() => router.push(`/collab/${project.id}`)}>
                
                {/* Expert Info */}
                <div className="flex items-center gap-4 md:w-1/4 shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 relative shrink-0 flex items-center justify-center">
                    {project.profiles?.avatar_url ? (
                      <Image src={project.profiles.avatar_url} fill sizes="48px" className="object-cover" alt="Expert" />
                    ) : (
                      <span className="text-slate-400 text-sm font-bold">{project.profiles?.full_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">{project.profiles?.full_name || 'Verified Expert'}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{project.profiles?.headline}</p>
                  </div>
                </div>

                {/* Project Details */}
                <div className="flex-1 w-full min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-black text-slate-900 truncate pr-4">{project.title}</h3>
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0 ${
                      project.status === 'completed' ? 'bg-green-100 text-green-700' :
                      project.status === 'funded' ? 'bg-amber-100 text-amber-700' : 
                      project.status === 'cancelled' ? 'bg-slate-100 text-slate-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 line-clamp-1 mb-4">{project.description}</p>
                  
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Budget</p>
                      <p className="text-sm font-black text-slate-900">${project.escrow_amount_usd?.toLocaleString()}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Initiated</p>
                      <p className="text-sm font-black text-slate-900">{new Date(project.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="md:pl-6 md:border-l border-slate-100 shrink-0 w-full md:w-auto mt-4 md:mt-0 flex justify-end">
                  <button className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm w-full md:w-auto">
                    Open Workspace
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}