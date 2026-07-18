'use client';

import Link from 'next/link';
import { formatExperience, formatPostedDate } from '@/lib/open-projects/formatters';

function formatDuration(days?: number | null): string | null {
  if (days == null) return null;
  return days === 1 ? 'Duration: 1 Day' : `Duration: ${days} Days`;
}

function formatProposals(count?: number): string {
  const n = count ?? 0;
  return n === 1 ? '1 Proposal' : `${n} Proposals`;
}

function formatBudget(min?: number | null, max?: number | null): string {
  const minLabel = min != null ? `$${min.toLocaleString()}` : '—';
  const maxLabel = max != null ? `$${max.toLocaleString()}` : '—';
  return `${minLabel} – ${maxLabel}`;
}

function CategoryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200/80">
      {children}
    </span>
  );
}

function MetaPill({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/60">
      <span aria-hidden="true">{icon}</span>
      {children}
    </span>
  );
}

type ProjectCardProps = {
  project: {
    id: string;
    title: string;
    description: string;
    category?: string | null;
    budget_min_usd?: number | null;
    budget_max_usd?: number | null;
    proposal_count?: number;
    experience_level?: string;
    expected_duration_days?: number | null;
    published_at?: string | null;
    is_featured?: boolean;
    skills?: Array<{ skill: string }>;
    buyer?: {
      full_name?: string | null;
      location?: string | null;
      verified_buyer?: boolean | null;
    } | null;
  };
  showViewDetails?: boolean;
};

export function ProjectCard({ project, showViewDetails = true }: ProjectCardProps) {
  const skills = project.skills?.map((s) => s.skill) ?? [];
  const durationLabel = formatDuration(project.expected_duration_days);
  const postedLabel = project.published_at
    ? formatPostedDate(project.published_at).replace('Posted today', 'Posted Today')
    : null;
  const experienceLabel = project.experience_level
    ? formatExperience(project.experience_level)
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 rounded-xl"
      aria-label={`View project: ${project.title}`}
    >
      <article className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-blue-200/80 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-blue-50/30 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {project.category && <CategoryPill>{project.category}</CategoryPill>}
            {experienceLabel && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-100">
                {experienceLabel}
              </span>
            )}
            {project.is_featured && (
              <span className="inline-flex items-center rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white ring-1 ring-amber-400/30">
                Featured
              </span>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Budget</p>
            <p className="text-sm font-bold tabular-nums text-slate-900">
              {formatBudget(project.budget_min_usd, project.budget_max_usd)}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
          <h3 className="mb-2 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-blue-700">
            {project.title}
          </h3>

          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
            {project.description}
          </p>

          {skills.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200/70"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 4 && (
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  +{skills.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Meta footer */}
          <div className="mt-auto space-y-3 border-t border-slate-100 pt-3">
            {(project.buyer?.full_name || project.buyer?.verified_buyer || project.buyer?.location) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-600">
                {project.buyer?.full_name && <span>{project.buyer.full_name}</span>}
                {project.buyer?.verified_buyer && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
                    <span aria-hidden="true">✅</span> Verified Buyer
                  </span>
                )}
                {project.buyer?.location && (
                  <span className="inline-flex items-center gap-0.5 text-slate-500">
                    <span aria-hidden="true">🌍</span> {project.buyer.location}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <MetaPill icon="👥">{formatProposals(project.proposal_count)}</MetaPill>
              {durationLabel && <MetaPill icon="⏳">{durationLabel}</MetaPill>}
              {postedLabel && <MetaPill icon="📅">{postedLabel}</MetaPill>}
            </div>

            {showViewDetails && (
              <p className="text-[11px] font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
                View Details →
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="flex h-full min-h-[280px] animate-pulse flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="h-5 w-24 rounded-full bg-slate-200" />
        <div className="space-y-1.5">
          <div className="ml-auto h-2.5 w-10 rounded bg-slate-100" />
          <div className="h-4 w-20 rounded bg-slate-200" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 py-4">
        <div className="mb-2 h-5 w-4/5 rounded bg-slate-200" />
        <div className="mb-1 h-4 w-full rounded bg-slate-100" />
        <div className="mb-4 h-4 w-3/5 rounded bg-slate-100" />
        <div className="mb-4 flex gap-1.5">
          <div className="h-5 w-14 rounded-md bg-slate-100" />
          <div className="h-5 w-16 rounded-md bg-slate-100" />
          <div className="h-5 w-12 rounded-md bg-slate-100" />
        </div>
        <div className="mt-auto space-y-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-24 rounded-md bg-slate-100" />
            <div className="h-6 w-28 rounded-md bg-slate-100" />
            <div className="h-6 w-28 rounded-md bg-slate-100" />
          </div>
          <div className="h-3 w-24 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
