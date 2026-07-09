'use client';

import React, { Suspense } from 'react';
import BrowseProjectsContent from './BrowseProjectsContent';

export default function BrowseProjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase text-slate-400 animate-pulse">Loading projects…</div>}>
      <BrowseProjectsContent />
    </Suspense>
  );
}
