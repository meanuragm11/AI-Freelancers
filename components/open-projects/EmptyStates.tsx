'use client';

import Link from 'next/link';

export function EmptyProjectsState({ variant }: { variant: 'browse' | 'buyer' | 'builder' | 'proposals' }) {
  const config = {
    browse: {
      title: 'No open projects yet',
      desc: 'Be the first to post a project and hire top AI talent.',
      cta: { href: '/projects/new', label: 'Post a Project' },
    },
    buyer: {
      title: 'No projects posted',
      desc: 'Post your first open project and receive proposals from verified AI experts.',
      cta: { href: '/projects/new', label: 'Post a Project' },
    },
    builder: {
      title: 'No proposals yet',
      desc: 'Browse open projects and submit your first proposal.',
      cta: { href: '/projects', label: 'Browse Projects' },
    },
    proposals: {
      title: 'No proposals received',
      desc: 'Share your project or wait for builders to discover it.',
      cta: null,
    },
  }[variant];

  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
      <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">{config.title}</p>
      <p className="text-xs font-medium text-slate-500 mb-6 max-w-md mx-auto">{config.desc}</p>
      {config.cta && (
        <Link href={config.cta.href} className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
          {config.cta.label}
        </Link>
      )}
    </div>
  );
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse h-48">
          <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
          <div className="h-4 w-full bg-slate-100 rounded mb-2" />
          <div className="h-4 w-2/3 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}
