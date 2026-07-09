'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ProjectCard, ProjectCardSkeleton } from '@/components/open-projects/ProjectCard';

export default function BuilderSavedProjectsPage() {
  const router = useRouter();
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data } = await supabase
        .from('saved_projects')
        .select(`
          created_at,
          project:projects(
            id, title, description, category, budget_min_usd, budget_max_usd,
            proposal_count, experience_level, published_at, is_featured,
            skills:project_skills(skill)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setSaved((data ?? []).filter((s) => s.project));
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <Link href="/builder/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-4 inline-block">← Workspace</Link>
        <h1 className="text-3xl font-black text-slate-900 mb-8">Saved Projects</h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <ProjectCardSkeleton key={i} />)}
          </div>
        ) : saved.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
            <p className="text-sm font-black uppercase text-slate-400 mb-4">No saved projects</p>
            <Link href="/projects" className="text-blue-600 font-black uppercase text-[10px] tracking-widest">Browse Projects →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {saved.map((s) => <ProjectCard key={s.project.id} project={s.project} />)}
          </div>
        )}
      </div>
    </div>
  );
}
