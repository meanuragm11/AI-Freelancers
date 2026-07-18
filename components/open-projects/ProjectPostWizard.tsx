'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { MarketplaceAlert } from '@/components/open-projects/MarketplaceAlert';
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

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

const SELECT_CLASS = `${INPUT_CLASS} font-semibold`;

const EXPERIENCE_OPTIONS = [
  { value: 'entry' as const, label: 'Entry', hint: 'Newer builders, lower rates' },
  { value: 'intermediate' as const, label: 'Intermediate', hint: 'Solid track record' },
  { value: 'expert' as const, label: 'Expert', hint: 'Senior specialists' },
];

type Props = {
  projectId?: string;
  initialData?: CreateProjectInput;
};

function FieldLabel({
  htmlFor,
  children,
  hint,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-2">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-black uppercase tracking-widest text-slate-500"
      >
        {children}
        {required && <span className="ml-1 text-blue-600">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs font-medium text-slate-400">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 md:p-6">
      <div className="mb-5 border-b border-slate-200/80 pb-4">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-slate-200/80 py-3 last:border-0 last:pb-0 first:pt-0">
      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

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
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [buyerLimitReached, setBuyerLimitReached] = useState(false);
  const [buyerLimitMessage, setBuyerLimitMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    Array<{ id: string; title: string; matchReasons: string[] }>
  >([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/buyer/project-limits?excludeProjectId=${projectId ?? ''}`)
      .then((r) => r.json())
      .then((d) => {
        setBuyerLimitReached(Boolean(d.limits?.limitReached));
        setBuyerLimitMessage(d.limits?.reason ?? null);
      })
      .catch(() => undefined);
  }, [userId, projectId]);

  useEffect(() => {
    if (step !== 4 || !form.title.trim() || !form.description.trim()) return;
    const timer = setTimeout(() => {
      fetch('/api/projects/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          budget_min_usd: form.budget_min_usd,
          budget_max_usd: form.budget_max_usd,
          skills: form.skills,
          excludeProjectId: projectId,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          setDuplicateWarning(d.warning ?? null);
          setDuplicateCandidates(d.candidates ?? []);
          if (!d.isDuplicate) setDuplicateAcknowledged(false);
        })
        .catch(() => undefined);
    }, 500);
    return () => clearTimeout(timer);
  }, [step, form.title, form.description, form.budget_min_usd, form.budget_max_usd, form.skills, projectId]);

  const autosave = useCallback(
    async (data: CreateProjectInput) => {
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
    },
    [projectId, userId]
  );

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
    setUploading(true);
    try {
      const url = await uploadMarketplaceFile(userId, 'project-attachments', file);
      update({
        attachments: [
          ...(form.attachments ?? []),
          { file_url: url, file_name: file.name, file_type: file.type },
        ],
      });
    } catch {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    update({ attachments: (form.attachments ?? []).filter((_, i) => i !== index) });
  };

  const handlePublish = async (acknowledgeDuplicate = false) => {
    if (buyerLimitReached) {
      setError(buyerLimitMessage ?? 'Temporary publishing limit reached');
      return;
    }
    if (duplicateWarning && !acknowledgeDuplicate && !duplicateAcknowledged) {
      setError('Please review the duplicate warning before publishing.');
      return;
    }

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
      const pubRes = await fetch(`/api/projects/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acknowledgeDuplicate: acknowledgeDuplicate || duplicateAcknowledged,
        }),
      });
      const pubJson = await pubRes.json();
      if (!pubRes.ok) {
        if (pubJson.code === 'duplicate_detected') {
          setDuplicateWarning(pubJson.error);
          throw new Error(pubJson.error);
        }
        if (pubJson.code === 'buyer_limit') {
          setBuyerLimitReached(true);
          setBuyerLimitMessage(pubJson.error);
        }
        throw new Error(pubJson.error);
      }

      if (pubJson.moderation?.pendingFounderReview && pubJson.moderation?.userMessage) {
        setPublishNotice(pubJson.moderation.userMessage);
        router.push(`/buyer/open-projects/${id}?review=pending`);
        return;
      }

      if (pubJson.moderation?.visibility === 'rejected' && pubJson.moderation?.userMessage) {
        setError(pubJson.moderation.userMessage);
        return;
      }

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
        return (form.builder_preferences?.custom_category?.trim().length ?? 0) >= 1;
      }
      return true;
    }
    if (step === 2) {
      return (form.budget_max_usd ?? 0) >= categoryMinBudget && !budgetError;
    }
    return true;
  };

  const displayCategory = isOtherCustomCategory(form.category)
    ? `${OTHER_CUSTOM_CATEGORY}: ${form.builder_preferences?.custom_category ?? ''}`
    : form.category;

  const paymentLabel =
    form.payment_type === 'single_payment' ? 'Single Payment' : 'Milestone Payment';

  const titleChars = form.title.trim().length;
  const descChars = form.description.trim().length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress stepper */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Step {step} of {TOTAL_STEPS}
          </p>
          {saving && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              Saving draft…
            </span>
          )}
        </div>

        <div className="hidden md:grid md:grid-cols-4 md:gap-2">
          {PROJECT_WIZARD_STEPS.map((s) => {
            const isActive = step === s.id;
            const isComplete = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`group rounded-2xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : isComplete
                      ? 'border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    isActive ? 'text-blue-100' : isComplete ? 'text-blue-500' : 'text-slate-400'
                  }`}
                >
                  Step {s.id}
                </p>
                <p className="mt-0.5 text-sm font-black">{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Mobile stepper */}
        <div className="md:hidden">
          <div className="mb-3 flex items-center gap-2">
            {PROJECT_WIZARD_STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step >= s.id ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm font-black text-slate-900">
            {PROJECT_WIZARD_STEPS.find((s) => s.id === step)?.label}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5 md:px-8">
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            {step === 1 && 'Project Basics'}
            {step === 2 && 'Budget & Timeline'}
            {step === 3 && 'Builder Preferences'}
            {step === 4 && 'Review & Publish'}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {step === 1 && 'Tell experts what you need built and the skills required.'}
            {step === 2 && 'Set your budget range, payment structure, and delivery timeline.'}
            {step === 3 && 'Specify the experience level you expect from proposals.'}
            {step === 4 && 'Confirm everything looks right before going live.'}
          </p>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
          {step === 1 && (
            <>
              <SectionCard title="Project Details" description="Give your project a clear title and detailed brief.">
                <div>
                  <FieldLabel htmlFor="project-title" required hint="Minimum 5 characters">
                    Title
                  </FieldLabel>
                  <input
                    id="project-title"
                    value={form.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="e.g., Build a RAG pipeline for legal documents"
                    className={`${INPUT_CLASS} font-semibold`}
                  />
                  <p
                    className={`mt-1.5 text-right text-[11px] font-medium ${
                      titleChars >= 5 ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {titleChars}/5 min
                  </p>
                </div>

                <div>
                  <FieldLabel htmlFor="project-description" required hint="Minimum 20 characters">
                    Description
                  </FieldLabel>
                  <textarea
                    id="project-description"
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                    rows={6}
                    placeholder="Describe goals, tech stack, deliverables, and success criteria…"
                    className={`${INPUT_CLASS} resize-none font-medium leading-relaxed`}
                  />
                  <p
                    className={`mt-1.5 text-right text-[11px] font-medium ${
                      descChars >= 20 ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {descChars}/20 min
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="Category" description="Choose the closest match so the right experts find your project.">
                <div>
                  <FieldLabel htmlFor="project-category" required>
                    Category
                  </FieldLabel>
                  <select
                    id="project-category"
                    value={form.category ?? ''}
                    onChange={(e) => update({ category: e.target.value })}
                    className={SELECT_CLASS}
                  >
                    <optgroup label="Creative / Quick AI Tasks">
                      {CREATIVE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Professional AI Services">
                      {PROFESSIONAL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      <option value={OTHER_CUSTOM_CATEGORY}>{OTHER_CUSTOM_CATEGORY}</option>
                    </optgroup>
                  </select>
                  <p className="mt-2 inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    Minimum budget for this category: ${categoryMinBudget} USD
                  </p>
                </div>

                {isOtherCustomCategory(form.category) && (
                  <div>
                    <FieldLabel htmlFor="custom-category" required hint="Describe your project type in a few words">
                      Describe Your Category
                    </FieldLabel>
                    <input
                      id="custom-category"
                      value={form.builder_preferences?.custom_category ?? ''}
                      onChange={(e) => updatePrefs({ custom_category: e.target.value })}
                      placeholder="e.g., AI-powered legal document review"
                      className={`${INPUT_CLASS} font-semibold`}
                    />
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Skills & Attachments" description="Optional but helps builders assess fit faster.">
                <div>
                  <FieldLabel hint="Press Enter or click Add for each skill">
                    Skills
                  </FieldLabel>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                      {(form.skills ?? []).map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-blue-800"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => update({ skills: form.skills?.filter((x) => x !== s) })}
                            className="text-blue-600 transition-colors hover:text-blue-900"
                            aria-label={`Remove ${s}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <div className="flex min-w-[200px] flex-1 items-center gap-2">
                        <input
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          placeholder="Python, LangChain, RAG…"
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={addSkill}
                          className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <FieldLabel hint="Briefs, specs, wireframes, or reference files">
                    Attachments
                  </FieldLabel>
                  <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-6 py-8 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/30">
                    <span className="mb-1 text-sm font-bold text-slate-700 group-hover:text-blue-700">
                      {uploading ? 'Uploading…' : 'Click to upload a file'}
                    </span>
                    <span className="text-xs font-medium text-slate-400">PDF, DOC, images, ZIP, and more</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="sr-only"
                    />
                  </label>
                  {(form.attachments ?? []).length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {(form.attachments ?? []).map((a, i) => (
                        <li
                          key={`${a.file_name}-${i}`}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5"
                        >
                          <span className="truncate text-sm font-medium text-slate-700">{a.file_name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="ml-3 shrink-0 text-xs font-bold uppercase tracking-wide text-rose-500 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </SectionCard>
            </>
          )}

          {step === 2 && (
            <>
              <SectionCard title="Budget (USD)" description={`Maximum budget must be at least $${categoryMinBudget} for ${form.category}.`}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="budget-min">Min Budget (USD)</FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        $
                      </span>
                      <input
                        id="budget-min"
                        type="number"
                        min={0}
                        value={form.budget_min_usd ?? ''}
                        onChange={(e) =>
                          update({ budget_min_usd: e.target.value ? Number(e.target.value) : null })
                        }
                        placeholder="Optional"
                        className={`${INPUT_CLASS} pl-8 font-bold tabular-nums`}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="budget-max" required>
                      Max Budget (USD)
                    </FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        $
                      </span>
                      <input
                        id="budget-max"
                        type="number"
                        min={categoryMinBudget}
                        value={form.budget_max_usd ?? ''}
                        onChange={(e) =>
                          update({ budget_max_usd: e.target.value ? Number(e.target.value) : null })
                        }
                        placeholder={`Min $${categoryMinBudget}`}
                        className={`${INPUT_CLASS} pl-8 font-bold tabular-nums`}
                      />
                    </div>
                  </div>
                </div>
                {budgetError && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {budgetError}
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Payment & Timeline">
                <div>
                  <FieldLabel required>Payment Structure</FieldLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(['single_payment', 'milestone_payment'] as const).map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => update({ payment_type: pt })}
                        className={`rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                          form.payment_type === pt
                            ? 'border-blue-600 bg-blue-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <p
                          className={`text-sm font-black ${
                            form.payment_type === pt ? 'text-blue-800' : 'text-slate-700'
                          }`}
                        >
                          {pt === 'single_payment' ? 'Single Payment' : 'Milestone Payment'}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {pt === 'single_payment'
                            ? 'Pay the full amount upon completion'
                            : 'Release funds as milestones are delivered'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="duration" required>
                      Duration (days)
                    </FieldLabel>
                    <input
                      id="duration"
                      type="number"
                      min={1}
                      value={form.expected_duration_days ?? ''}
                      onChange={(e) => update({ expected_duration_days: Number(e.target.value) })}
                      className={`${INPUT_CLASS} font-bold tabular-nums`}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="deadline">Deadline</FieldLabel>
                    <input
                      id="deadline"
                      type="date"
                      value={form.deadline ?? ''}
                      onChange={(e) => update({ deadline: e.target.value || null })}
                      className={`${INPUT_CLASS} font-semibold`}
                    />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {step === 3 && (
            <SectionCard
              title="Experience Level"
              description="Set expectations for the seniority of builders who should apply."
            >
              <FieldLabel required>Experience Level</FieldLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {EXPERIENCE_OPTIONS.map(({ value, label, hint }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ experience_level: value })}
                    className={`rounded-2xl border-2 px-4 py-4 text-left capitalize transition-all ${
                      form.experience_level === value
                        ? 'border-blue-600 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p
                      className={`text-sm font-black ${
                        form.experience_level === value ? 'text-blue-800' : 'text-slate-700'
                      }`}
                    >
                      {label}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <SectionCard title="Project Summary">
                <dl>
                  <ReviewRow label="Title" value={form.title || '—'} />
                  <ReviewRow label="Category" value={displayCategory || '—'} />
                  <ReviewRow
                    label="Description"
                    value={
                      <span className="block whitespace-pre-wrap font-medium leading-relaxed text-slate-600">
                        {form.description || '—'}
                      </span>
                    }
                  />
                  <ReviewRow
                    label="Skills"
                    value={(form.skills ?? []).length > 0 ? (form.skills ?? []).join(', ') : 'None specified'}
                  />
                  <ReviewRow
                    label="Attachments"
                    value={
                      (form.attachments ?? []).length > 0
                        ? (form.attachments ?? []).map((a) => a.file_name).join(', ')
                        : 'None'
                    }
                  />
                </dl>
              </SectionCard>

              <SectionCard title="Budget & Timeline">
                <dl>
                  <ReviewRow
                    label="Budget (USD)"
                    value={`$${form.budget_min_usd?.toLocaleString() ?? '—'} – $${form.budget_max_usd?.toLocaleString() ?? '—'}`}
                  />
                  <ReviewRow label="Payment Structure" value={paymentLabel} />
                  <ReviewRow
                    label="Duration"
                    value={form.expected_duration_days ? `${form.expected_duration_days} days` : '—'}
                  />
                  <ReviewRow
                    label="Deadline"
                    value={
                      form.deadline
                        ? new Date(`${form.deadline}T12:00:00`).toLocaleDateString(undefined, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'No deadline set'
                    }
                  />
                  <ReviewRow
                    label="Experience Level"
                    value={
                      EXPERIENCE_OPTIONS.find((o) => o.value === form.experience_level)?.label ??
                      form.experience_level
                    }
                  />
                </dl>
              </SectionCard>

              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Funds enter escrow only after you hire a builder and fund milestones.
              </p>

              {buyerLimitReached && buyerLimitMessage && (
                <MarketplaceAlert
                  title="Temporary publishing limit"
                  message={buyerLimitMessage}
                  variant="error"
                />
              )}

              {duplicateWarning && (
                <div className="space-y-3">
                  <MarketplaceAlert
                    title="Possible duplicate project"
                    message={duplicateWarning}
                    variant="warning"
                    action={
                      duplicateCandidates.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-amber-800">
                          {duplicateCandidates.slice(0, 3).map((c) => (
                            <li key={c.id}>
                              <Link href={`/buyer/open-projects/${c.id}`} className="font-semibold underline">
                                {c.title}
                              </Link>
                              {' — '}
                              {c.matchReasons.join(', ')}
                            </li>
                          ))}
                        </ul>
                      ) : undefined
                    }
                  />
                  <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={duplicateAcknowledged}
                      onChange={(e) => setDuplicateAcknowledged(e.target.checked)}
                      className="mt-1 rounded border-slate-300"
                    />
                    <span>I reviewed my existing projects and confirm this is not a duplicate listing.</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-semibold text-rose-700">{error}</p>
            </div>
          )}

          {publishNotice && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-semibold text-blue-800">{publishNotice}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => s - 1)}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
          >
            Back
          </button>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              disabled={!canNext() || uploading}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-slate-900 px-8 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={publishing || buyerLimitReached}
              onClick={() => handlePublish()}
              className="rounded-xl bg-blue-600 px-8 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {publishing ? 'Publishing…' : 'Publish Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
