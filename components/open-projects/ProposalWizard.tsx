'use client';



import React, { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabaseClient';

import { uploadMarketplaceFile } from '@/lib/storage/upload';

import {

  builderNetAfterOpenProposalFee,

  calculateOpenProposalPlatformFee,

} from '@/lib/milestones/platformFees';

import { fetchBuilderWorkHistory } from '@/lib/profile';

import { usePortfolioProjects } from '@/lib/portfolio/usePortfolioProjects';

import {

  PROPOSAL_ATTACHMENT_ACCEPT,

  PROPOSAL_WIZARD_STEPS,

  buildProposalExtrasPayload,

} from '@/lib/open-projects/types';

import type { CompletedProjectReview } from '@/types/profile';



type ProposalWizardProps = {

  projectId: string;

};



export function ProposalWizard({ projectId }: ProposalWizardProps) {

  const router = useRouter();



  const [step, setStep] = useState(1);

  const [project, setProject] = useState<any>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [workHistory, setWorkHistory] = useState<CompletedProjectReview[]>([]);

  const [workHistoryLoading, setWorkHistoryLoading] = useState(false);



  const [form, setForm] = useState({

    cover_letter: '',

    proposed_amount_usd: '',

    proposed_duration_days: '14',

    payment_type: 'single_payment' as 'single_payment' | 'milestone_payment',

    attachments: [] as Array<{ file_url: string; file_name: string }>,

    highlighted_portfolio_project_id: '' as string,

    highlighted_work_ids: [] as string[],

  });



  const { projects: portfolioProjects, loading: portfolioLoading } = usePortfolioProjects(userId ?? undefined);



  useEffect(() => {

    supabase.auth.getUser().then(({ data }) => {

      if (!data.user) router.push(`/auth?redirect=/builder/proposals/new?project=${projectId}`);

      else setUserId(data.user.id);

    });

    if (projectId) {

      fetch(`/api/projects/${projectId}`).then((r) => r.json()).then((d) => setProject(d.project));

    }

  }, [projectId, router]);



  useEffect(() => {

    if (!userId) return;

    setWorkHistoryLoading(true);

    fetchBuilderWorkHistory(userId)

      .then(setWorkHistory)

      .catch(() => setWorkHistory([]))

      .finally(() => setWorkHistoryLoading(false));

  }, [userId]);



  const amount = parseFloat(form.proposed_amount_usd) || 0;

  const durationDays = parseInt(form.proposed_duration_days, 10) || 0;

  const platformFee = calculateOpenProposalPlatformFee(amount);

  const netPayout = builderNetAfterOpenProposalFee(amount);



  const coverLetterValid = form.cover_letter.trim().length > 0;

  const bidValid = amount > 0;

  const deliveryValid = durationDays > 0;

  const canSubmit = coverLetterValid && bidValid && deliveryValid;



  const canContinue = useMemo(() => {

    if (step === 1) return coverLetterValid;

    if (step === 2) return bidValid && deliveryValid;

    return true;

  }, [step, coverLetterValid, bidValid, deliveryValid]);



  const handleSubmit = async () => {

    if (!canSubmit) return;

    setLoading(true);

    setError(null);

    try {

      const proposed_milestones = buildProposalExtrasPayload({

        highlighted_portfolio_project_id: form.highlighted_portfolio_project_id || null,

        highlighted_work_ids: form.highlighted_work_ids,

      });



      const res = await fetch(`/api/projects/${projectId}/proposals`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          cover_letter: form.cover_letter.trim(),

          proposed_amount_usd: amount,

          proposed_duration_days: durationDays,

          payment_type: form.payment_type,

          attachments: form.attachments,

          proposed_milestones,

          status: 'submitted',

        }),

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      router.push('/builder/proposals?submitted=1');

      router.refresh();

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to submit');

      setLoading(false);

    }

  };



  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file || !userId) return;

    setUploading(true);

    try {

      const url = await uploadMarketplaceFile(userId, 'proposal-attachments', file);

      setForm((f) => ({ ...f, attachments: [...f.attachments, { file_url: url, file_name: file.name }] }));

    } catch {

      setError('Failed to upload file');

    } finally {

      setUploading(false);

      e.target.value = '';

    }

  };



  const removeAttachment = (index: number) => {

    setForm((f) => ({ ...f, attachments: f.attachments.filter((_, i) => i !== index) }));

  };



  const toggleWorkHighlight = (id: string) => {

    setForm((f) => ({

      ...f,

      highlighted_work_ids: f.highlighted_work_ids.includes(id)

        ? f.highlighted_work_ids.filter((w) => w !== id)

        : [...f.highlighted_work_ids, id],

    }));

  };



  const selectedPortfolio = portfolioProjects.find((p) => p.id === form.highlighted_portfolio_project_id);



  return (

    <div className="max-w-2xl mx-auto">

      <Link href={`/projects/${projectId}`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-4 inline-block">← {project?.title ?? 'Project'}</Link>

      <h1 className="text-2xl font-black text-slate-900 mb-6">Submit Proposal</h1>



      <div className="flex flex-wrap gap-2 mb-6">

        {PROPOSAL_WIZARD_STEPS.map((s) => (

          <span key={s.id} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${step === s.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{s.label}</span>

        ))}

      </div>



      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">

        {step === 1 && (

          <div className="space-y-4">

            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Cover Letter *</label>

            <textarea

              value={form.cover_letter}

              onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}

              rows={8}

              maxLength={2000}

              placeholder="Explain your approach, relevant experience, and deliverables…"

              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none"

              required

            />

            <p className="text-[10px] text-slate-400 text-right">{form.cover_letter.length}/2000</p>

          </div>

        )}



        {step === 2 && (

          <div className="space-y-6">

            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Bid Amount (USD) *</label>

              <input

                type="number"

                min={0.01}

                step={0.01}

                value={form.proposed_amount_usd}

                onChange={(e) => setForm({ ...form, proposed_amount_usd: e.target.value })}

                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none"

                required

              />

              {amount > 0 && (

                <p className="mt-2 text-xs font-medium text-slate-600">

                  You will receive{' '}

                  <span className="font-black text-green-700">${netPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>

                  {' '}after Zelance platform fees (${platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })})

                </p>

              )}

            </div>



            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Estimated Delivery (days) *</label>

              <input

                type="number"

                min={1}

                value={form.proposed_duration_days}

                onChange={(e) => setForm({ ...form, proposed_duration_days: e.target.value })}

                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none"

                required

              />

            </div>

          </div>

        )}



        {step === 3 && (

          <div className="space-y-8">

            <div>

              <div className="flex items-center justify-between mb-3">

                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attachments</label>

                <span className="text-[9px] font-bold text-slate-400 uppercase">Optional</span>

              </div>

              <input

                type="file"

                accept={PROPOSAL_ATTACHMENT_ACCEPT}

                onChange={handleFile}

                disabled={uploading}

                className="text-sm"

              />

              <p className="text-[10px] text-slate-400 mt-1">PDF, DOCX, PPTX, ZIP, PNG, JPG, MP4</p>

              {uploading && <p className="text-[10px] font-bold text-slate-400 mt-1">Uploading…</p>}

              {form.attachments.length > 0 && (

                <ul className="mt-3 space-y-2">

                  {form.attachments.map((a, i) => (

                    <li key={a.file_url} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm">

                      <span className="truncate font-medium text-slate-700">{a.file_name}</span>

                      <button type="button" onClick={() => removeAttachment(i)} className="text-[10px] font-black uppercase text-rose-500 shrink-0 ml-2">Remove</button>

                    </li>

                  ))}

                </ul>

              )}

            </div>



            <div>

              <div className="flex items-center justify-between mb-3">

                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Highlight Portfolio Project</label>

                <span className="text-[9px] font-bold text-slate-400 uppercase">Optional · Pick one</span>

              </div>

              {portfolioLoading ? (

                <p className="text-xs font-bold text-slate-400 animate-pulse">Loading portfolio…</p>

              ) : portfolioProjects.length === 0 ? (

                <p className="text-xs text-slate-500">No portfolio projects yet. Add projects from your Builder Workspace portfolio tab.</p>

              ) : (

                <div className="space-y-2 max-h-48 overflow-y-auto">

                  {portfolioProjects.map((p) => (

                    <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.highlighted_portfolio_project_id === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>

                      <input

                        type="radio"

                        name="portfolio_highlight"

                        checked={form.highlighted_portfolio_project_id === p.id}

                        onChange={() => setForm({ ...form, highlighted_portfolio_project_id: p.id })}

                        className="mt-1"

                      />

                      <div className="min-w-0">

                        <p className="text-sm font-black text-slate-900 truncate">{p.title}</p>

                        {p.short_description && <p className="text-xs text-slate-500 line-clamp-2">{p.short_description}</p>}

                      </div>

                    </label>

                  ))}

                  {form.highlighted_portfolio_project_id && (

                    <button type="button" onClick={() => setForm({ ...form, highlighted_portfolio_project_id: '' })} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Clear selection</button>

                  )}

                </div>

              )}

            </div>



            {!workHistoryLoading && workHistory.length > 0 && (

              <div>

                <div className="flex items-center justify-between mb-3">

                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Highlight Previous Zelance Work</label>

                  <span className="text-[9px] font-bold text-slate-400 uppercase">Optional</span>

                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">

                  {workHistory.map((w) => (

                    <label key={w.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.highlighted_work_ids.includes(w.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>

                      <input

                        type="checkbox"

                        checked={form.highlighted_work_ids.includes(w.id)}

                        onChange={() => toggleWorkHighlight(w.id)}

                        className="mt-1 rounded border-slate-300"

                      />

                      <div className="min-w-0">

                        <p className="text-sm font-black text-slate-900 truncate">{w.service_name}</p>

                        {w.amount_usd != null && (

                          <p className="text-[10px] font-bold text-slate-400 uppercase">${w.amount_usd.toLocaleString()}</p>

                        )}

                      </div>

                    </label>

                  ))}

                </div>

              </div>

            )}

          </div>

        )}



        {step === 4 && (

          <div className="space-y-4 text-sm">

            <p><span className="font-black uppercase text-[10px] text-slate-400">Bid</span><br /><span className="text-lg font-black text-slate-900">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>

            <p><span className="font-black uppercase text-[10px] text-slate-400">You Receive (approx.)</span><br /><span className="font-black text-green-700">${netPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> after ${platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })} platform fee</p>

            <p><span className="font-black uppercase text-[10px] text-slate-400">Delivery</span><br />{durationDays} days</p>

            <p><span className="font-black uppercase text-[10px] text-slate-400">Cover Letter</span><br /><span className="text-slate-600 line-clamp-6">{form.cover_letter}</span></p>

            {form.attachments.length > 0 && (

              <p><span className="font-black uppercase text-[10px] text-slate-400">Attachments</span><br />{form.attachments.map((a) => a.file_name).join(', ')}</p>

            )}

            {selectedPortfolio && (

              <p><span className="font-black uppercase text-[10px] text-slate-400">Portfolio Highlight</span><br />{selectedPortfolio.title}</p>

            )}

            {form.highlighted_work_ids.length > 0 && (

              <p><span className="font-black uppercase text-[10px] text-slate-400">Previous Work</span><br />{form.highlighted_work_ids.length} project{form.highlighted_work_ids.length !== 1 ? 's' : ''} highlighted</p>

            )}

            <p className="text-[10px] font-bold text-amber-600 uppercase">Scope locks on hire — escrow protects both parties.</p>

          </div>

        )}



        {error && <p className="mt-4 text-sm font-bold text-rose-600">{error}</p>}



        <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">

          <button type="button" disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Back</button>

          {step < 4 ? (

            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canContinue} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-40">Continue</button>

          ) : (

            <button type="button" onClick={handleSubmit} disabled={loading || !canSubmit} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50">{loading ? 'Submitting…' : 'Submit Proposal'}</button>

          )}

        </div>

      </div>

    </div>

  );

}

