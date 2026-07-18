'use client';

import React, { Suspense } from 'react';
import { ProposalWizard } from '@/components/open-projects/ProposalWizard';

type ProposalSubmitModalProps = {
  projectId: string;
  open: boolean;
  onClose: () => void;
};

export function ProposalSubmitModal({ projectId, open, onClose }: ProposalSubmitModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm md:p-8">
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="proposal-modal-title" className="text-lg font-bold text-slate-900">
            Submit Proposal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <Suspense
            fallback={
              <div className="p-12 text-center text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
                Loading proposal form…
              </div>
            }
          >
            <ProposalWizard projectId={projectId} embedded onSuccess={onClose} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
