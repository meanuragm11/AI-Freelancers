'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import HireConfirmationModal from '@/components/open-projects/HireConfirmationModal';
import { EmptyProjectsState } from '@/components/open-projects/EmptyStates';
import { ProposalListCard } from '@/components/open-projects/ProposalListCard';
import { ProjectActivityTimeline } from '@/components/open-projects/ProjectActivityTimeline';
import { openBuilderConversation } from '@/lib/open-projects/openBuilderConversation';

const PROPOSAL_PAGE_SIZE = 10;
type Tab = 'overview' | 'proposals' | 'activity';

export default function BuyerProjectDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'overview';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalsTotal, setProposalsTotal] = useState(0);
  const [proposalsPage, setProposalsPage] = useState(0);
  const [proposalsLoading, setProposalsLoading] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [hireTarget, setHireTarget] = useState<any>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const loadProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      const d = await res.json();
      setProject(d.project);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const loadProposals = useCallback(async () => {
    if (!id) return;
    setProposalsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PROPOSAL_PAGE_SIZE),
        offset: String(proposalsPage * PROPOSAL_PAGE_SIZE),
      });
      const res = await fetch(`/api/projects/${id}/proposals?${params}`);
      const d = await res.json();
      setProposals(d.proposals ?? []);
      setProposalsTotal(d.total ?? 0);
    } finally {
      setProposalsLoading(false);
    }
  }, [id, proposalsPage]);

  const loadActivity = useCallback(async () => {
    if (!id) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/activity`);
      const d = await res.json();
      setEvents(d.events ?? []);
    } finally {
      setActivityLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (tab === 'proposals') void loadProposals();
  }, [tab, loadProposals]);

  useEffect(() => {
    if (tab === 'activity') void loadActivity();
  }, [tab, loadActivity]);

  const handleClose = async () => {
    if (!confirm('Close this project to new proposals?')) return;
    await fetch(`/api/projects/${id}/close`, { method: 'POST' });
    void loadProject();
  };

  const handleReopen = async () => {
    if (!confirm('Reopen this project to new proposals?')) return;
    await fetch(`/api/projects/${id}/reopen`, { method: 'POST' });
    void loadProject();
  };

  const handleReject = async (proposalId: string) => {
    if (!confirm('Reject this proposal?')) return;
    await fetch(`/api/projects/${id}/proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    });
    void loadProposals();
    if (tab === 'activity') void loadActivity();
    void loadProject();
  };

  const handleMessage = async (proposal: any) => {
    if (!userId || !project) return;
    setMessagingId(proposal.id);
    try {
      const conversationId = await openBuilderConversation({
        buyerId: userId,
        builderId: proposal.builder_id,
        projectTitle: project.title,
        projectDescription: project.description,
      });
      router.push(`/buyer/messages?conversation=${conversationId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open conversation');
    } finally {
      setMessagingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400">Loading…</div>;
  }
  if (!project) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-500">Project not found</div>;
  }

  const skills = project.skills?.map((s: { skill: string }) => s.skill) ?? [];
  const attachments = project.attachments ?? [];
  const proposalPages = Math.ceil(proposalsTotal / PROPOSAL_PAGE_SIZE);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'proposals', label: `Proposals (${project.proposal_count ?? 0})` },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <Link href="/buyer/open-projects" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-4 inline-block">← My Projects</Link>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest mb-3 ${
                project.status === 'published' ? 'bg-green-100 text-green-700' :
                project.status === 'hired' ? 'bg-blue-100 text-blue-700' :
                project.status === 'closed' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {project.status === 'published' ? 'Open' : project.status}
              </span>
              <h1 className="text-2xl font-black text-slate-900">{project.title}</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{project.category}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-slate-400">Budget</p>
              <p className="text-lg font-black text-slate-900">${project.budget_min_usd?.toLocaleString()} – ${project.budget_max_usd?.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{project.proposal_count ?? 0} proposals · {project.view_count ?? 0} views</p>
            </div>
          </div>

          <div className="flex gap-2 border-b border-slate-100 mb-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                  tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div>
              <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap mb-6">{project.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                {project.expected_duration_days && (
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Timeline</p>
                    <p className="font-black text-slate-900">{project.expected_duration_days} days</p>
                  </div>
                )}
                {project.deadline && (
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Deadline</p>
                    <p className="font-black text-slate-900">{new Date(project.deadline).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Experience</p>
                  <p className="font-black text-slate-900 capitalize">{project.experience_level}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Payment</p>
                  <p className="font-black text-slate-900 capitalize">{project.payment_type?.replace('_', ' ')}</p>
                </div>
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {skills.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-full">{s}</span>
                  ))}
                </div>
              )}

              {attachments.length > 0 && (
                <div className="mb-6">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((a: { id: string; file_name: string; file_url: string }) => (
                      <a
                        key={a.id}
                        href={a.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                      >
                        {a.file_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100">
                {project.status === 'published' && (
                  <>
                    <button type="button" onClick={() => setTab('proposals')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      View Proposals ({project.proposal_count ?? 0})
                    </button>
                    <button type="button" onClick={handleClose} className="px-6 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">Close Project</button>
                  </>
                )}
                {project.status === 'closed' && (
                  <button type="button" onClick={handleReopen} className="px-6 py-3 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-widest">Reopen Project</button>
                )}
                {project.status === 'hired' && project.collab_id && (
                  <Link href={`/collab/${project.collab_id}`} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Open Collab Workspace</Link>
                )}
                {project.status === 'draft' && (
                  <Link href={`/projects/new?edit=${id}`} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Edit Project</Link>
                )}
              </div>
            </div>
          )}

          {tab === 'proposals' && (
            <div>
              {proposalsLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2].map((i) => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
                </div>
              ) : proposals.length === 0 ? (
                <EmptyProjectsState variant="proposals" />
              ) : (
                <>
                  <div className="space-y-4">
                    {proposals.map((p) => (
                      <ProposalListCard
                        key={p.id}
                        proposal={p}
                        projectStatus={project.status}
                        onHire={setHireTarget}
                        onReject={handleReject}
                        onMessage={handleMessage}
                        messaging={messagingId === p.id}
                      />
                    ))}
                  </div>
                  {proposalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                      <button
                        type="button"
                        disabled={proposalsPage === 0}
                        onClick={() => setProposalsPage((p) => p - 1)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-500 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Page {proposalsPage + 1} of {proposalPages}</span>
                      <button
                        type="button"
                        disabled={proposalsPage >= proposalPages - 1}
                        onClick={() => setProposalsPage((p) => p + 1)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-500 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <ProjectActivityTimeline events={events} loading={activityLoading} />
          )}
        </div>
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
