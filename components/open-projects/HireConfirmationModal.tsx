'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  projectId: string;
  projectTitle: string;
  proposalId: string;
  builderName: string;
  amount: number;
  onClose: () => void;
};

export default function HireConfirmationModal({
  projectId,
  projectTitle,
  proposalId,
  builderName,
  amount,
  onClose,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHire = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
      } else if (data.collabId) {
        router.push(`/collab/${data.collabId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hire failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-black text-slate-900 mb-2">Confirm Hire</h2>
        <p className="text-sm text-slate-500 mb-6">
          Hire <strong>{builderName}</strong> for <strong>{projectTitle}</strong> at <strong>${amount.toLocaleString()}</strong>?
        </p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
          Other proposals will be rejected. You&apos;ll proceed to escrow funding.
        </p>
        {error && <p className="text-sm font-bold text-rose-600 mb-4">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">Cancel</button>
          <button type="button" onClick={handleHire} disabled={loading} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
            {loading ? 'Hiring…' : 'Hire & Fund Escrow'}
          </button>
        </div>
      </div>
    </div>
  );
}
