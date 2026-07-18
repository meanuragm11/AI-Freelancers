'use client';

import Link from 'next/link';
import type { ProjectStatus } from '@/lib/open-projects/types';

type BuyerProject = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  budget_min_usd?: number | null;
  budget_max_usd?: number | null;
  proposal_count?: number;
  status: ProjectStatus;
  published_at?: string | null;
  created_at?: string;
};

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  hired: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-600',
  closed: 'bg-amber-100 text-amber-700',
  archived: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-rose-100 text-rose-600',
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Open',
  closed: 'Closed',
  hired: 'Hired',
  draft: 'Draft',
  archived: 'Archived',
  cancelled: 'Cancelled',
};

type Props = {
  project: BuyerProject;
  onClose?: (id: string) => void;
  onReopen?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
};

export function BuyerProjectCard({ project, onClose, onReopen, onRestore, onDelete, compact }: Props) {
  const postedDate = project.published_at ?? project.created_at;
  const isOpen = project.status === 'published';

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-blue-200 transition-colors ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest mb-2 ${STATUS_STYLES[project.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
          <h3 className="text-base font-black text-slate-900 line-clamp-2">{project.title}</h3>
          {project.category && (
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{project.category}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black uppercase text-slate-400">Budget</p>
          <p className="text-sm font-black text-slate-900">
            ${project.budget_min_usd?.toLocaleString() ?? '—'} – ${project.budget_max_usd?.toLocaleString() ?? '—'}
          </p>
        </div>
      </div>

      {!compact && (
        <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4">{project.description}</p>
      )}

      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
        <span>{project.proposal_count ?? 0} proposals</span>
        {postedDate && (
          <span>Posted {new Date(postedDate).toLocaleDateString()}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
        <Link
          href={`/buyer/open-projects/${project.id}`}
          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest"
        >
          View
        </Link>
        {project.status === 'draft' && (
          <Link
            href={`/projects/new?edit=${project.id}`}
            className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
          >
            Edit
          </Link>
        )}
        {isOpen && onClose && (
          <button
            type="button"
            onClick={() => onClose(project.id)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
          >
            Close
          </button>
        )}
        {project.status === 'closed' && onReopen && (
          <button
            type="button"
            onClick={() => onReopen(project.id)}
            className="px-3 py-2 rounded-xl border border-green-200 text-[10px] font-black uppercase tracking-widest text-green-700 hover:bg-green-50"
          >
            Reopen
          </button>
        )}
        {project.status === 'archived' && onRestore && (
          <button
            type="button"
            onClick={() => onRestore(project.id)}
            className="px-3 py-2 rounded-xl border border-purple-200 text-[10px] font-black uppercase tracking-widest text-purple-700 hover:bg-purple-50"
          >
            Restore
          </button>
        )}
        {project.status !== 'hired' && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            className="px-3 py-2 rounded-xl border border-rose-200 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function BuyerProjectCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
      <div className="h-4 w-16 bg-slate-100 rounded mb-3" />
      <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
      <div className="h-8 w-full bg-slate-50 rounded" />
    </div>
  );
}
