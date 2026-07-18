'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from '@/components/RemoteImage';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { buildAuthUrl, saveAuthRedirect } from '@/lib/auth/postAuthRedirect';
import {
  formatExperience,
  formatFileSizeHint,
  formatPayment,
  formatPostedDate,
} from '@/lib/open-projects/formatters';
import {
  formatDisplayName,
  getDisplayNameInitials,
} from '@/lib/display/formatDisplayName';
import { MarketplaceAlert } from '@/components/open-projects/MarketplaceAlert';
import { ProjectCard } from '@/components/open-projects/ProjectCard';
import { ProposalSubmitModal } from '@/components/open-projects/ProposalSubmitModal';

type ProjectData = {
  id: string;
  buyer_id?: string;
  title: string;
  description: string;
  category?: string | null;
  budget_min_usd?: number | null;
  budget_max_usd?: number | null;
  payment_type?: string | null;
  expected_duration_days?: number | null;
  deadline?: string | null;
  experience_level?: string | null;
  status?: string;
  proposal_count?: number;
  published_at?: string | null;
  is_featured?: boolean;
  skills?: Array<{ skill: string }>;
  attachments?: Array<{ id: string; file_url: string; file_name: string; file_type?: string | null }>;
  buyer?: {
    full_name?: string | null;
    avatar_url?: string | null;
    created_at?: string | null;
    location?: string | null;
    verified_buyer?: boolean | null;
    total_jobs_posted?: number;
    total_spent_usd?: number;
    response_rate_percent?: number | null;
    average_first_response_label?: string | null;
  } | null;
};

type Eligibility = {
  canSubmit: boolean;
  requiresAuth?: boolean;
  reason?: string;
  limits?: {
    dailyLimitReached?: boolean;
    activeLimitReached?: boolean;
    dailyCount?: number;
    activeCount?: number;
  } | null;
  hasExistingProposal?: boolean;
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p>}
    </div>
  );
}

function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm ${className}`}>
      <h2 className="mb-4 text-sm font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export default function OpenProjectDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [similarProjects, setSimilarProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      setProject(data.project ?? null);
      setSimilarProjects(data.similarProjects ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadEligibility = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/projects/${id}/eligibility`);
    const data = await res.json();
    setEligibility(data.eligibility ?? null);
  }, [id]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    void loadEligibility();
  }, [loadEligibility, userId]);

  useEffect(() => {
    if (searchParams.get('propose') === '1') {
      if (!userId) {
        const returnPath = `/projects/${id}?propose=1`;
        saveAuthRedirect(returnPath);
        router.replace(buildAuthUrl(returnPath));
        return;
      }
      setProposalModalOpen(true);
      router.replace(`/projects/${id}`, { scroll: false });
    }
  }, [searchParams, userId, id, router]);

  const handleSubmitClick = () => {
    if (!userId) {
      const returnPath = `/projects/${id}?propose=1`;
      saveAuthRedirect(returnPath);
      router.push(buildAuthUrl(returnPath));
      return;
    }
    if (eligibility?.hasExistingProposal) {
      router.push('/builder/proposals');
      return;
    }
    setProposalModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="animate-pulse text-xs font-bold uppercase tracking-widest text-slate-400">
          Loading project…
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-semibold text-slate-500">Project not found</p>
      </div>
    );
  }

  const skills = project.skills?.map((s) => s.skill) ?? [];
  const isOwner = userId && project.buyer_id === userId;
  const buyerDisplayName = isOwner
    ? project.buyer?.full_name ?? 'Buyer'
    : formatDisplayName(project.buyer?.full_name) || 'Buyer';
  const isPublished = project.status === 'published';
  const canShowSubmit = isPublished && !isOwner;
  const submitDisabled = Boolean(userId && eligibility && !eligibility.canSubmit && !eligibility.requiresAuth);

  const limitAlert = eligibility?.limits?.dailyLimitReached
    ? {
        title: 'Daily proposal limit reached',
        message: "You've reached today's proposal limit. Please try again tomorrow.",
        variant: 'warning' as const,
      }
    : eligibility?.limits?.activeLimitReached
      ? {
          title: 'Active proposal limit reached',
          message:
            'You have 5 active proposals. Withdraw or wait for buyer responses before submitting more.',
          variant: 'warning' as const,
        }
      : eligibility?.reason && submitDisabled
        ? {
            title: 'Cannot submit proposal',
            message: eligibility.reason,
            variant: 'error' as const,
          }
        : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 md:px-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600"
          >
            ← Open Projects
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <header className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {project.is_featured && (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                    Featured
                  </span>
                )}
                {project.category && (
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                    {project.category}
                  </span>
                )}
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {formatExperience(project.experience_level)}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                {project.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                <span>{formatPostedDate(project.published_at)}</span>
                <span>·</span>
                <span>{project.proposal_count ?? 0} proposals</span>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <StatCard
                label="Budget"
                value={`$${project.budget_min_usd?.toLocaleString() ?? '—'} – $${project.budget_max_usd?.toLocaleString() ?? '—'}`}
                sub="USD"
              />
              <StatCard
                label="Duration"
                value={project.expected_duration_days ? `${project.expected_duration_days} days` : 'Flexible'}
              />
              <StatCard label="Payment" value={formatPayment(project.payment_type)} />
              <StatCard
                label="Deadline"
                value={
                  project.deadline
                    ? new Date(project.deadline).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Open'
                }
              />
            </div>

            {skills.length > 0 && (
              <Section title="Required Skills">
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Project Description">
              <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600">
                <p className="whitespace-pre-wrap">{project.description}</p>
              </div>
            </Section>

            {project.attachments && project.attachments.length > 0 && (
              <Section title="Attachments">
                <ul className="divide-y divide-slate-100">
                  {project.attachments.map((file) => (
                    <li key={file.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{file.file_name}</p>
                        <p className="text-xs text-slate-500">{formatFileSizeHint(file.file_type)}</p>
                      </div>
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {similarProjects.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-bold text-slate-900">Similar Open Projects</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {similarProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={{
                        ...p,
                        experience_level: p.experience_level ?? undefined,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <div className="lg:sticky lg:top-24 space-y-6">
              {canShowSubmit && (
                <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900">Interested in this project?</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Submit a tailored proposal with your approach, timeline, and rate. Message the buyer
                    after your proposal conversation opens.
                  </p>

                  {limitAlert && (
                    <div className="mt-4">
                      <MarketplaceAlert
                        title={limitAlert.title}
                        message={limitAlert.message}
                        variant={limitAlert.variant}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={submitDisabled}
                    className="mt-5 w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {eligibility?.hasExistingProposal ? 'View My Proposal' : 'Submit Proposal'}
                  </button>
                </div>
              )}

              {project.buyer && (
                <Section title="Buyer Information">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-100">
                      {project.buyer.avatar_url ? (
                        <Image
                          src={project.buyer.avatar_url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-400">
                          {getDisplayNameInitials(buyerDisplayName)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        {buyerDisplayName}
                        {project.buyer.verified_buyer && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                            ✅ Verified Buyer
                          </span>
                        )}
                      </p>
                      {project.buyer.created_at && (
                        <p className="text-xs text-slate-500">
                          Member since{' '}
                          {new Date(project.buyer.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      {project.buyer.location && (
                        <p className="text-xs text-slate-500">🌍 {project.buyer.location}</p>
                      )}
                      {project.buyer.total_jobs_posted != null && (
                        <p className="text-xs text-slate-500">
                          {project.buyer.total_jobs_posted} job{project.buyer.total_jobs_posted === 1 ? '' : 's'} posted
                        </p>
                      )}
                      {(project.buyer.total_spent_usd ?? 0) > 0 && (
                        <p className="text-xs text-slate-500">
                          ${project.buyer.total_spent_usd!.toLocaleString()} spent
                        </p>
                      )}
                      {project.buyer.response_rate_percent != null && (
                        <p className="text-xs text-slate-500">
                          Response rate: {project.buyer.response_rate_percent}%
                        </p>
                      )}
                      {project.buyer.average_first_response_label && (
                        <p className="text-xs text-slate-500">
                          {project.buyer.average_first_response_label}
                        </p>
                      )}
                    </div>
                  </div>
                </Section>
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                <p className="text-xs font-semibold leading-relaxed text-blue-900/80">
                  Payments are protected through Zelance escrow. Funds are released only when milestones
                  are approved.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ProposalSubmitModal
        projectId={id}
        open={proposalModalOpen}
        onClose={() => {
          setProposalModalOpen(false);
          void loadEligibility();
        }}
      />
    </div>
  );
}
