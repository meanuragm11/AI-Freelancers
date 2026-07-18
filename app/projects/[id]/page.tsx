'use client';

import React, { Suspense } from 'react';
import OpenProjectDetailContent from '@/components/open-projects/OpenProjectDetailContent';

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="animate-pulse text-xs font-bold uppercase tracking-widest text-slate-400">
        Loading project…
      </p>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OpenProjectDetailContent />
    </Suspense>
  );
}
