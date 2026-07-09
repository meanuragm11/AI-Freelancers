'use client';



import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { uploadMarketplaceFile } from '@/lib/storage/upload';

import { supabase } from '@/lib/supabaseClient';

import {

  CREATIVE_CATEGORIES,

  getBudgetValidationMessage,

  getCategoryMinBudgetUsd,

  isOtherCustomCategory,

  OTHER_CUSTOM_CATEGORY,

  PROFESSIONAL_CATEGORIES,

} from '@/lib/open-projects/categories';

import { sanitizeBuilderPreferences } from '@/lib/open-projects/validation';

import {

  PROJECT_CATEGORIES,

  PROJECT_WIZARD_STEPS,

  type BuilderPreferences,

  type CreateProjectInput,

} from '@/lib/open-projects/types';



const EMPTY_FORM: CreateProjectInput = {

  title: '',

  description: '',

  category: PROJECT_CATEGORIES[0],

  budget_min_usd: null,

  budget_max_usd: null,

  budget_type: 'fixed',

  payment_type: 'single_payment',

  expected_duration_days: 30,

  deadline: null,

  visibility: 'public',

  experience_level: 'intermediate',

  project_type: 'one_time',

  builder_preferences: {},

  skills: [],

  attachments: [],

  status: 'draft',

};



const TOTAL_STEPS = PROJECT_WIZARD_STEPS.length;



type Props = {

  projectId?: string;

  initialData?: CreateProjectInput;

};



function preparePayload(data: CreateProjectInput): CreateProjectInput {

  return {

    ...data,

    visibility: 'public',

    builder_preferences: sanitizeBuilderPreferences(data.builder_preferences),

  };

}



export default function ProjectPostWizard({ projectId: initialProjectId, initialData }: Props) {

  const router = useRouter();

  const [step, setStep] = useState(1);

  const [form, setForm] = useState<CreateProjectInput>(initialData ?? EMPTY_FORM);

  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);

  const [skillInput, setSkillInput] = useState('');

  const [saving, setSaving] = useState(false);

  const [publishing, setPublishing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);



  const categoryMinBudget = useMemo(

    () => getCategoryMinBudgetUsd(form.category),

    [form.category]

  );



  const budgetError = useMemo(() => {

    if (step !== 2 || form.budget_max_usd == null) return null;

    if (form.budget_max_usd < categoryMinBudget) {

      return getBudgetValidationMessage(form.category);

    }

    if (

      form.budget_min_usd != null &&

      form.budget_max_usd != null &&

      form.budget_min_usd > form.budget_max_usd

    ) {

      return 'Minimum budget cannot exceed maximum budget.';

    }

    return null;

  }, [step, form.budget_max_usd, form.budget_min_usd, form.category, categoryMinBudget]);



  useEffect(() => {

    supabase.auth.getUser().then(({ data }) => {

      if (!data.user) router.push('/auth?redirect=/projects/new');

      else setUserId(data.user.id);

    });

  }, [router]);



  const autosave = useCallback(async (data: CreateProjectInput) => {

    if (!userId) return;

    setSaving(true);

    try {

      const payload = preparePayload({ ...data, status: 'draft' });

      if (projectId) {

        await fetch(`/api/projects/${projectId}`, {

          method: 'PATCH',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(payload),

        });

      } else {

        const res = await fetch('/api/projects', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(payload),

        });

        if (res.ok) {

          const json = await res.json();

          setProjectId(json.project.id);

        }

      }

    } catch {

      /* best-effort autosave */

    } finally {

      setSaving(false);

    }

  }, [projectId, userId]);



  useEffect(() => {

    const timer = setTimeout(() => {

      if (form.title || form.description) void autosave(form);

    }, 2000);

    return () => clearTimeout(timer);

  }, [form, autosave]);



  const update = (patch: Partial<CreateProjectInput>) => setForm((f) => ({ ...f, ...patch }));



  const updatePrefs = (patch: Partial<BuilderPreferences>) =>

    setForm((f) => ({ ...f, builder_preferences: { ...f.builder_preferences, ...patch } }));



  const addSkill = () => {

    const s = skillInput.trim();

    if (!s || form.skills?.includes(s)) return;

    update({ skills: [...(form.skills ?? []), s] });

    setSkillInput('');

  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file || !userId) return;

    try {

      const url = await uploadMarketplaceFile(userId, 'project-attachments', file);

      update({

        attachments: [...(form.attachments ?? []), { file_url: url, file_name: file.name, file_type: file.type }],

      });

    } catch {

      setError('Failed to upload file');

    }

  };



  const handlePublish = async () => {

    setPublishing(true);

    setError(null);

    try {

      const payload = preparePayload(form);

      let id = projectId;

      if (!id) {

        const res = await fetch('/api/projects', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ ...payload, status: 'draft' }),

        });

        const json = await res.json();

        if (!res.ok) throw new Error(json.error);

        id = json.project.id;

        setProjectId(id);

      } else {

        const res = await fetch(`/api/projects/${id}`, {

          method: 'PATCH',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(payload),

        });

        const json = await res.json();

        if (!res.ok) throw new Error(json.error);

      }

      const pubRes = await fetch(`/api/projects/${id}/publish`, { method: 'POST' });

      const pubJson = await pubRes.json();

      if (!pubRes.ok) throw new Error(pubJson.error);

      router.push(`/buyer/open-projects/${id}`);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to publish');

    } finally {

      setPublishing(false);

    }

  };



  const canNext = () => {

    if (step === 1) {

      const basicsValid =

        form.title.trim().length >= 5 &&

        form.description.trim().length >= 20 &&

        !!form.category;

      if (!basicsValid) return false;

      if (isOtherCustomCategory(form.category)) {

        return (form.builder_preferences?.custom_category?.trim().length ?? 0) >= 3;

      }

      return true;

    }

    if (step === 2) {

      return (

        (form.budget_max_usd ?? 0) >= categoryMinBudget &&

        !budgetError

      );

    }

    return true;

  };



  const displayCategory = isOtherCustomCategory(form.category)

    ? `${OTHER_CUSTOM_CATEGORY}: ${form.builder_preferences?.custom_category ?? ''}`

    : form.category;



  return (

    <div className="max-w-3xl mx-auto">

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">

        {PROJECT_WIZARD_STEPS.map((s) => (

          <button

            key={s.id}

            type="button"

            onClick={() => setStep(s.id)}

            className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${

              step === s.id ? 'bg-blue-600 text-white shadow-md' : step > s.id ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-400 border border-slate-200'

            }`}

          >

            {s.label}

          </button>

        ))}

        {saving && <span className="text-[10px] font-bold text-slate-400 self-center ml-2">Saving…</span>}

      </div>



      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">

        {step === 1 && (

          <div className="space-y-6">

            <h2 className="text-xl font-black text-slate-900">Project Basics</h2>

            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Title</label>

              <input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g., Build a RAG pipeline for legal documents" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none" />

            </div>

            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Description</label>

              <textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={6} placeholder="Describe goals, tech stack, deliverables, and success criteria…" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none resize-none" />

            </div>

            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Category</label>

              <select value={form.category ?? ''} onChange={(e) => update({ category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none">

                <optgroup label="Creative / Quick AI Tasks">

                  {CREATIVE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}

                </optgroup>

                <optgroup label="Professional AI Services">

                  {PROFESSIONAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}

                </optgroup>

                <optgroup label="Other">

                  <option value={OTHER_CUSTOM_CATEGORY}>{OTHER_CUSTOM_CATEGORY}</option>

                </optgroup>

              </select>

              <p className="text-[10px] font-bold text-slate-400 mt-2">

                Minimum budget for this category: ${categoryMinBudget}

              </p>

            </div>

            {isOtherCustomCategory(form.category) && (

              <div>

                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Describe Your Category</label>

                <input

                  value={form.builder_preferences?.custom_category ?? ''}

                  onChange={(e) => updatePrefs({ custom_category: e.target.value })}

                  placeholder="e.g., AI-powered legal document review"

                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none"

                />

              </div>

            )}

            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Required Skills</label>

              <div className="flex gap-2 mb-2">

                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="Python, LangChain…" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" />

                <button type="button" onClick={addSkill} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Add</button>

              </div>

              <div className="flex flex-wrap gap-2">

                {(form.skills ?? []).map((s) => (

                  <span key={s} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">

                    {s}

                    <button type="button" onClick={() => update({ skills: form.skills?.filter((x) => x !== s) })}>×</button>

                  </span>

                ))}

              </div>

            </div>

            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Attachments</label>

              <input type="file" onChange={handleFileUpload} className="text-sm" />

              {(form.attachments ?? []).map((a, i) => (

                <p key={i} className="text-xs text-slate-500 mt-1">{a.file_name}</p>

              ))}

            </div>

          </div>

        )}



        {step === 2 && (

          <div className="space-y-6">

            <h2 className="text-xl font-black text-slate-900">Budget & Timeline</h2>

            <p className="text-sm text-slate-500 font-medium">

              Set your project budget. Minimum for <span className="font-bold text-slate-700">{form.category}</span>: ${categoryMinBudget}.

            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>

                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Min Budget (USD)</label>

                <input type="number" min={0} value={form.budget_min_usd ?? ''} onChange={(e) => update({ budget_min_usd: e.target.value ? Number(e.target.value) : null })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />

              </div>

              <div>

                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Max Budget (USD)</label>

                <input type="number" min={categoryMinBudget} value={form.budget_max_usd ?? ''} onChange={(e) => update({ budget_max_usd: e.target.value ? Number(e.target.value) : null })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />

              </div>

            </div>

            {budgetError && (

              <p className="text-sm font-bold text-rose-600">{budgetError}</p>

            )}

            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Payment Structure</label>

              <div className="flex gap-3">

                {(['single_payment', 'milestone_payment'] as const).map((pt) => (

                  <button key={pt} type="button" onClick={() => update({ payment_type: pt })} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${form.payment_type === pt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>

                    {pt === 'single_payment' ? 'Single Payment' : 'Milestones'}

                  </button>

                ))}

              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>

                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Duration (days)</label>

                <input type="number" min={1} value={form.expected_duration_days ?? ''} onChange={(e) => update({ expected_duration_days: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />

              </div>

              <div>

                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Deadline</label>

                <input type="date" value={form.deadline ?? ''} onChange={(e) => update({ deadline: e.target.value || null })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />

              </div>

            </div>

          </div>

        )}



        {step === 3 && (

          <div className="space-y-6">

            <h2 className="text-xl font-black text-slate-900">Builder Preferences</h2>

            <div>

              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Experience Level</label>

              <div className="flex gap-3">

                {(['entry', 'intermediate', 'expert'] as const).map((lvl) => (

                  <button key={lvl} type="button" onClick={() => update({ experience_level: lvl })} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-2 capitalize ${form.experience_level === lvl ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>{lvl}</button>

                ))}

              </div>

            </div>

          </div>

        )}



        {step === 4 && (

          <div className="space-y-4">

            <h2 className="text-xl font-black text-slate-900">Review & Publish</h2>

            <div className="bg-slate-50 rounded-xl p-5 space-y-3 text-sm">

              <p><span className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Title</span><br />{form.title}</p>

              <p><span className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Category</span><br />{displayCategory}</p>

              <p><span className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Project Budget</span><br />${form.budget_min_usd?.toLocaleString() ?? '—'} – ${form.budget_max_usd?.toLocaleString() ?? '—'}</p>

              <p><span className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Skills</span><br />{(form.skills ?? []).join(', ') || 'None'}</p>

              <p className="text-slate-600 line-clamp-4">{form.description}</p>

            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Funds enter escrow only after you hire a builder and fund milestones.</p>

          </div>

        )}



        {error && <p className="mt-4 text-sm font-bold text-rose-600">{error}</p>}



        <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">

          <button type="button" disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-30">Back</button>

          {step < TOTAL_STEPS ? (

            <button type="button" disabled={!canNext()} onClick={() => setStep((s) => s + 1)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40">Continue</button>

          ) : (

            <button type="button" disabled={publishing} onClick={handlePublish} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50">

              {publishing ? 'Publishing…' : 'Publish Project'}

            </button>

          )}

        </div>

      </div>

    </div>

  );

}


