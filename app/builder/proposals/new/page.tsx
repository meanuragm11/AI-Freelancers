'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { uploadMarketplaceFile } from '@/lib/storage/upload';
import { PROPOSAL_WIZARD_STEPS } from '@/lib/open-projects/types';

function ProposalWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') ?? '';

  const [step, setStep] = useState(1);
  const [project, setProject] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    cover_letter: '',
    proposed_amount_usd: '',
    proposed_duration_days: '14',
    payment_type: 'single_payment' as 'single_payment' | 'milestone_payment',
    attachments: [] as Array<{ file_url: string; file_name: string }>,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push(`/auth?redirect=/builder/proposals/new?project=${projectId}`);
      else setUserId(data.user.id);
    });
    if (projectId) {
      fetch(`/api/projects/${projectId}`).then((r) => r.json()).then((d) => setProject(d.project));
    }
  }, [projectId, router]);

  const amount = parseFloat(form.proposed_amount_usd) || 0;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cover_letter: form.cover_letter,
          proposed_amount_usd: amount,
          proposed_duration_days: Number(form.proposed_duration_days),
          payment_type: form.payment_type,
          attachments: form.attachments,
          status: 'submitted',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/builder/proposals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      setLoading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const url = await uploadMarketplaceFile(userId, 'proposal-attachments', file);
    setForm((f) => ({ ...f, attachments: [...f.attachments, { file_url: url, file_name: file.name }] }));
  };

  if (!projectId) return <p className="p-12 text-center text-slate-500">Missing project ID</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/projects/${projectId}`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-4 inline-block">← {project?.title ?? 'Project'}</Link>
      <h1 className="text-2xl font-black text-slate-900 mb-6">Submit Proposal</h1>

      <div className="flex gap-2 mb-6">
        {PROPOSAL_WIZARD_STEPS.map((s) => (
          <span key={s.id} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${step === s.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{s.label}</span>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Cover Letter</label>
            <textarea value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} rows={8} maxLength={2000} placeholder="Explain your approach, relevant experience, and deliverables…" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none" required />
            <p className="text-[10px] text-slate-400 text-right">{form.cover_letter.length}/2000</p>
            <input type="file" onChange={handleFile} className="text-sm" />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Your Bid (USD)</label>
              <input type="number" min={50} value={form.proposed_amount_usd} onChange={(e) => setForm({ ...form, proposed_amount_usd: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none" required />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Delivery (days)</label>
              <input type="number" min={1} value={form.proposed_duration_days} onChange={(e) => setForm({ ...form, proposed_duration_days: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none" />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3 text-sm">
            <p><span className="font-black uppercase text-[10px] text-slate-400">Amount</span><br />${amount.toLocaleString()}</p>
            <p><span className="font-black uppercase text-[10px] text-slate-400">Duration</span><br />{form.proposed_duration_days} days</p>
            <p className="text-slate-600 line-clamp-6">{form.cover_letter}</p>
            <p className="text-[10px] font-bold text-amber-600 uppercase">Scope locks on hire — escrow protects both parties.</p>
          </div>
        )}

        {error && <p className="mt-4 text-sm font-bold text-rose-600">{error}</p>}

        <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
          <button type="button" disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Back</button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && form.cover_letter.length < 50} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-40">Continue</button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading || amount < 50} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50">{loading ? 'Submitting…' : 'Submit Proposal'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewProposalPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <Suspense fallback={<div className="text-center text-xs font-black uppercase text-slate-400 animate-pulse">Loading…</div>}>
        <ProposalWizardInner />
      </Suspense>
    </div>
  );
}
