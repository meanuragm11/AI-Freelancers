'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function BuyerProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project))
      .finally(() => setLoading(false));
  }, [id]);

  const handleClose = async () => {
    if (!confirm('Close this project to new proposals?')) return;
    await fetch(`/api/projects/${id}/close`, { method: 'POST' });
    router.refresh();
    const res = await fetch(`/api/projects/${id}`);
    const d = await res.json();
    setProject(d.project);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading…</div>;
  if (!project) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-500">Project not found</div>;

  const skills = project.skills?.map((s: { skill: string }) => s.skill) ?? [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/buyer/open-projects" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-4 inline-block">← My Projects</Link>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm mb-6">
          <div className="flex justify-between items-start gap-4 mb-6">
            <div>
              <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest mb-3 ${
                project.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>{project.status}</span>
              <h1 className="text-2xl font-black text-slate-900">{project.title}</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{project.category}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-slate-400">Budget</p>
              <p className="text-lg font-black text-slate-900">${project.budget_min_usd?.toLocaleString()} – ${project.budget_max_usd?.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{project.proposal_count ?? 0} proposals · {project.view_count ?? 0} views</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap mb-6">{project.description}</p>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {skills.map((s: string) => (
                <span key={s} className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-full">{s}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100">
            {project.status === 'published' && (
              <>
                <Link href={`/buyer/open-projects/${id}/proposals`} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  View Proposals ({project.proposal_count ?? 0})
                </Link>
                <button type="button" onClick={handleClose} className="px-6 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">Close Project</button>
              </>
            )}
            {project.status === 'hired' && project.collab_id && (
              <Link href={`/collab/${project.collab_id}`} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Open Collab Workspace</Link>
            )}
            {project.status === 'draft' && (
              <Link href={`/projects/new?edit=${id}`} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Continue Editing</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
