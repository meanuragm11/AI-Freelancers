'use client';

import Link from 'next/link';

function formatPostedAt(publishedAt?: string | null): string | null {
  if (!publishedAt) return null;
  const ms = Date.now() - new Date(publishedAt).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  return new Date(publishedAt).toLocaleDateString();
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
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  const skills = project.skills?.map((s) => s.skill) ?? [];
  const postedLabel = formatPostedAt(project.published_at);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-blue-200 transition-all group h-full"
    >
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0 flex-1">
          {project.is_featured && (
            <span className="inline-block mb-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-md">Featured</span>
          )}
          <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">{project.title}</h3>
          {project.category && (
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{project.category}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Budget</p>
          <p className="text-sm font-black text-slate-900">
            ${project.budget_min_usd?.toLocaleString() ?? '—'} – ${project.budget_max_usd?.toLocaleString() ?? '—'}
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4">{project.description}</p>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skills.slice(0, 4).map((s) => (
            <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-md">{s}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>{project.proposal_count ?? 0} proposals</span>
          {project.expected_duration_days != null && (
            <span>{project.expected_duration_days} days</span>
          )}
          {postedLabel && <span>{postedLabel}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse h-48">
      <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
      <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
      <div className="h-4 w-full bg-slate-100 rounded mb-2" />
      <div className="h-4 w-2/3 bg-slate-100 rounded" />
    </div>
  );
}
