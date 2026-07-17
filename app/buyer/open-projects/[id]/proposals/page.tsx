'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Legacy route — redirects to unified detail page with Proposals tab. */
export default function BuyerProposalsRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) router.replace(`/buyer/open-projects/${id}?tab=proposals`);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400">
      Redirecting…
    </div>
  );
}
