"use client";

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  useEffect(() => {
    // In production, route this to Sentry or Datadog
    console.error("Zelance Global Exception:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mb-6 border-4 border-rose-50">
        <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">System Interruption</h1>
      <p className="text-sm font-medium text-slate-500 max-w-md mb-8">
        A critical error occurred while fetching this data. Our engineering team has been notified of the anomaly.
      </p>
      <div className="flex gap-4">
        <button onClick={() => reset()} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md">
          Reboot Process
        </button>
        <Link href="/" className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  );
}