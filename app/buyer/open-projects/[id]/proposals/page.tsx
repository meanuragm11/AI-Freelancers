'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import HireConfirmationModal from '@/components/open-projects/HireConfirmationModal';
import { EmptyProjectsState } from '@/components/open-projects/EmptyStates';
import { pickDisplayableImageUrl } from '@/lib/images';

export default function BuyerProposalsPage() {
  const { id } = useParams<{ id: string }>();
  const [proposals, setProposals] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hireTarget, setHireTarget] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/projects/${id}/proposals`).then((r) => r.json()),
      fetch(`/api/projects/${id}`).then((r) => r.json()),
    ]).then(([propData, projData]) => {
      setProposals(propData.proposals ?? []);
      setProject(projData.project);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleShortlist = async (proposalId: string) => {
    await fetch(`/api/projects/${id}/proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shortlisted' }),
    });
    const res = await fetch(`/api/projects/${id}/proposals`);
    const d = await res.json();
    setProposals(d.proposals ?? []);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading proposals…</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <Link href={`/buyer/open-projects/${id}`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-4 inline-block">← {project?.title ?? 'Project'}</Link>
        <h1 className="text-3xl font-black text-slate-900 mb-8">Compare Proposals</h1>

        {proposals.length === 0 ? (
          <EmptyProjectsState variant="proposals" />
        ) : (
          <div className="space-y-4">
            {proposals.map((p) => {
              const builder = p.builder ?? {};
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex items-center gap-4 md:w-1/4 shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 relative">
                        {builder.avatar_url && (
                          <Image src={pickDisplayableImageUrl(builder.avatar_url)!} fill sizes="48px" className="object-cover" alt="" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{builder.full_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{builder.headline}</p>
                        {builder.is_verified && <span className="text-[9px] font-black text-blue-600 uppercase">Verified</span>}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <p className="text-lg font-black text-slate-900">${Number(p.proposed_amount_usd).toLocaleString()}</p>
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                          p.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          p.status === 'shortlisted' ? 'bg-blue-100 text-blue-700' :
                          p.status === 'rejected' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                        }`}>{p.status}</span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-4 mb-4">{p.cover_letter}</p>
                      {p.proposed_duration_days && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery: {p.proposed_duration_days} days</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {project?.status === 'published' && ['submitted', 'shortlisted'].includes(p.status) && (
                        <>
                          {p.status === 'submitted' && (
                            <button type="button" onClick={() => handleShortlist(p.id)} className="px-4 py-2 rounded-xl border border-blue-200 text-blue-600 text-[10px] font-black uppercase">Shortlist</button>
                          )}
                          <button type="button" onClick={() => setHireTarget(p)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase">Hire</button>
                        </>
                      )}
                      <Link href={`/profile/${p.builder_id}`} className="px-4 py-2 rounded-xl border border-slate-200 text-center text-[10px] font-black uppercase text-slate-500">View Profile</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hireTarget && project && (
        <HireConfirmationModal
          projectId={id!}
          projectTitle={project.title}
          proposalId={hireTarget.id}
          builderName={hireTarget.builder?.full_name ?? 'Builder'}
          amount={Number(hireTarget.proposed_amount_usd)}
          onClose={() => setHireTarget(null)}
        />
      )}
    </div>
  );
}
