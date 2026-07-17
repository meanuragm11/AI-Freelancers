'use client';

import React, { Suspense } from 'react';
import BuyerProjectDetailContent from './BuyerProjectDetailContent';

export default function BuyerProjectDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400">Loading…</div>
    }>
      <BuyerProjectDetailContent />
    </Suspense>
  );
}
