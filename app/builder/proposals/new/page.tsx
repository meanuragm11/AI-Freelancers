'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProposalWizard } from '@/components/open-projects/ProposalWizard';

function NewProposalContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') ?? '';

  if (!projectId) return <p className="p-12 text-center text-slate-500">Missing project ID</p>;

  return <ProposalWizard projectId={projectId} />;
}

export default function NewProposalPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <Suspense fallback={<div className="text-center text-xs font-black uppercase text-slate-400 animate-pulse">Loading…</div>}>
        <NewProposalContent />
      </Suspense>
    </div>
  );
}
