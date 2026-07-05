"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { uploadMarketplaceFile } from "@/lib/storage/upload";
import {
  EMPTY_SERVICE_FORM,
  SERVICE_CATEGORIES,
  validateServiceForm,
  type ServiceFormPortfolioProject,
  type ServiceFormState,
} from "@/lib/services/form";
import { saveServiceFromForm } from "@/lib/services/saveServiceForm";
import type { Service } from "@/types/marketplace";

type ServiceFormModalProps = {
  builderId: string;
  open: boolean;
  editingService: Service | null;
  initialForm?: ServiceFormState;
  onClose: () => void;
  onSaved: () => void;
};

const STEPS = [
  { id: 1, label: "Overview" },
  { id: 2, label: "Pricing" },
  { id: 3, label: "Media" },
  { id: 4, label: "Portfolio & FAQs" },
] as const;

function ChipInput({
  label,
  placeholder,
  values,
  onChange,
  inputRef,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  inputRef?: React.Ref<ChipInputHandle>;
}) {
  const [input, setInput] = useState("");

  const commitPending = React.useCallback((): string[] => {
    const next = input.trim();
    if (!next || values.includes(next)) {
      setInput("");
      return values;
    }
    const updated = [...values, next];
    onChange(updated);
    setInput("");
    return updated;
  }, [input, onChange, values]);

  React.useImperativeHandle(
    inputRef,
    () => ({
      commitPending,
    }),
    [commitPending]
  );

  const addValue = () => {
    commitPending();
  };

  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-800"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="text-blue-600 hover:text-blue-900"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={() => {
            if (input.trim()) commitPending();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={placeholder}
          className="min-w-[140px] flex-1 bg-transparent text-sm font-medium outline-none"
        />
      </div>
      <p className="mt-1 text-[10px] font-medium text-slate-400">Press Enter to add each item.</p>
    </div>
  );
}

export type ChipInputHandle = {
  commitPending: () => string[];
};

function ListInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${label}-${index}`} className="flex gap-2">
            <input
              value={value}
              onChange={(e) => {
                const next = [...values];
                next[index] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-500 hover:bg-slate-100"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="rounded-xl border border-dashed border-slate-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-blue-400 hover:text-blue-600"
        >
          + Add Item
        </button>
      </div>
    </div>
  );
}

export default function ServiceFormModal({
  builderId,
  open,
  editingService,
  initialForm,
  onClose,
  onSaved,
}: ServiceFormModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_SERVICE_FORM);
  const [draftServiceId, setDraftServiceId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const skillsInputRef = React.useRef<ChipInputHandle>(null);
  const tagsInputRef = React.useRef<ChipInputHandle>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setErrors([]);
    setDraftServiceId(editingService?.id);
    setForm(initialForm ?? EMPTY_SERVICE_FORM);
  }, [open, initialForm, editingService?.id]);

  if (!open) return null;

  const updateForm = (patch: Partial<ServiceFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const uploadImage = async (
    file: File,
    field: "cover_image_url" | "banner_image_url"
  ) => {
    setUploading(true);
    try {
      const url = await uploadMarketplaceFile(builderId, "services", file);
      updateForm({ [field]: url });
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Image upload failed"]);
    } finally {
      setUploading(false);
    }
  };

  const uploadGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadMarketplaceFile(builderId, "services", file));
      }
      updateForm({ gallery_urls: [...form.gallery_urls, ...uploaded] });
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Gallery upload failed"]);
    } finally {
      setUploading(false);
    }
  };

  const updatePortfolio = (index: number, patch: Partial<ServiceFormPortfolioProject>) => {
    const next = [...form.portfolioProjects];
    next[index] = { ...next[index], ...patch };
    updateForm({ portfolioProjects: next });
  };

  const addPortfolioProject = () => {
    updateForm({
      portfolioProjects: [
        ...form.portfolioProjects,
        {
          title: "",
          short_description: "",
          detailed_description: "",
          project_url: "",
          media_files: [],
          pendingFiles: [],
        },
      ],
    });
  };

  const buildFormWithCommittedChips = () => {
    const ai_skills = skillsInputRef.current?.commitPending() ?? form.ai_skills;
    const tags = tagsInputRef.current?.commitPending() ?? form.tags;
    return { ...form, ai_skills, tags };
  };

  const persistDraft = async (formSnapshot: ServiceFormState, closeAfterSave: boolean) => {
    const validation = validateServiceForm(formSnapshot, "draft");
    if (!validation.valid) {
      setErrors(validation.errors);
      return null;
    }

    setSaving(true);
    setErrors([]);
    try {
      const saved = await saveServiceFromForm(builderId, formSnapshot, {
        serviceId: draftServiceId ?? editingService?.id,
        publish: false,
      });
      setDraftServiceId(saved.id);
      setForm(formSnapshot);
      onSaved();
      if (closeAfterSave) onClose();
      return saved;
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Failed to save service"]);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    const formSnapshot = step === 1 ? buildFormWithCommittedChips() : form;
    const validation = validateServiceForm(formSnapshot, publish ? "publish" : "draft");
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      await saveServiceFromForm(builderId, formSnapshot, {
        serviceId: draftServiceId ?? editingService?.id,
        publish,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Failed to save service"]);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (step >= 4) return;
    const formSnapshot = step === 1 ? buildFormWithCommittedChips() : form;
    const saved = await persistDraft(formSnapshot, false);
    if (saved) {
      setStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handleStepSelect = async (targetStep: number) => {
    if (targetStep === step) return;
    if (targetStep < step) {
      setStep(targetStep);
      return;
    }
    const formSnapshot = step === 1 ? buildFormWithCommittedChips() : form;
    const saved = await persistDraft(formSnapshot, false);
    if (saved) setStep(targetStep);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {editingService ? "Edit Service" : "New Service"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {editingService ? editingService.title : "Create AI Service Listing"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Build a professional fixed-price service for the Zelance marketplace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="border-b border-slate-100 px-6 py-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {STEPS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleStepSelect(item.id)}
                disabled={saving || uploading}
                className={`rounded-xl px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                  step === item.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Step {item.id}</p>
                <p className="text-xs font-black">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {errors.length > 0 && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              {errors.map((error) => (
                <p key={error} className="text-sm font-medium text-rose-700">
                  {error}
                </p>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Service Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  placeholder="e.g., Custom RAG Chatbot for Your Business"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => updateForm({ category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                >
                  {SERVICE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Demo Video URL
                </label>
                <input
                  value={form.demo_video_url}
                  onChange={(e) => updateForm({ demo_video_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Short Description *
                </label>
                <textarea
                  value={form.short_description}
                  onChange={(e) => updateForm({ short_description: e.target.value })}
                  rows={2}
                  placeholder="One-line summary shown in cards and search results"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Detailed Description *
                </label>
                <textarea
                  value={form.detailed_description}
                  onChange={(e) => updateForm({ detailed_description: e.target.value })}
                  rows={6}
                  placeholder="Explain deliverables, process, tools, and outcomes in detail"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <ChipInput
                  label="Skills / AI Technologies"
                  placeholder="Add a skill (e.g., LangChain)"
                  values={form.ai_skills}
                  onChange={(ai_skills) => updateForm({ ai_skills })}
                  inputRef={skillsInputRef}
                />
              </div>
              <div className="md:col-span-2">
                <ChipInput
                  label="Tags"
                  placeholder="Add a tag (e.g., chatbot)"
                  values={form.tags}
                  onChange={(tags) => updateForm({ tags })}
                  inputRef={tagsInputRef}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Fixed Price (USD) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.starting_price_usd}
                  onChange={(e) => updateForm({ starting_price_usd: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-[10px] font-medium text-slate-400">Minimum $6 to publish.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Delivery Time (Days) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.delivery_time_days}
                  onChange={(e) => updateForm({ delivery_time_days: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Included Revisions
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.included_revisions}
                  onChange={(e) => updateForm({ included_revisions: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Extra Revision Price (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.extra_revision_price_usd}
                  onChange={(e) => updateForm({ extra_revision_price_usd: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <ListInput
                  label="What's Included"
                  values={form.whats_included.length ? form.whats_included : [""]}
                  onChange={(whats_included) => updateForm({ whats_included })}
                  placeholder="e.g., Source code delivery"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Requirements From Buyer
                </label>
                <textarea
                  value={form.requirements_from_buyer}
                  onChange={(e) => updateForm({ requirements_from_buyer: e.target.value })}
                  rows={4}
                  placeholder="What do you need from the buyer before starting?"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Thumbnail *
                </label>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  {form.cover_image_url ? (
                    <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-slate-200">
                      <Image src={form.cover_image_url} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" alt="Thumbnail" />
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file, "cover_image_url");
                    }}
                    className="text-xs"
                  />
                  <p className="mt-2 text-[10px] font-medium text-slate-400">Used in cards, search, and listings.</p>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Banner Image
                </label>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  {form.banner_image_url ? (
                    <div className="relative mb-3 aspect-[21/9] overflow-hidden rounded-xl bg-slate-200">
                      <Image src={form.banner_image_url} fill sizes="100vw" className="object-cover" alt="Banner" />
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file, "banner_image_url");
                    }}
                    className="text-xs"
                  />
                  <p className="mt-2 text-[10px] font-medium text-slate-400">Wide hero image on the service page.</p>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Gallery Images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => void uploadGallery(e.target.files)}
                  className="text-xs"
                />
                {form.gallery_urls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {form.gallery_urls.map((url) => (
                      <div key={url} className="group relative aspect-video overflow-hidden rounded-xl bg-slate-100">
                        <Image src={url} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" alt="Gallery" />
                        <button
                          type="button"
                          onClick={() =>
                            updateForm({ gallery_urls: form.gallery_urls.filter((item) => item !== url) })
                          }
                          className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-black text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Portfolio / Project Examples</h3>
                    <p className="text-xs text-slate-500">Show relevant work samples for this service.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addPortfolioProject}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    + Add Project
                  </button>
                </div>
                <div className="space-y-4">
                  {form.portfolioProjects.map((project, index) => (
                    <div key={project.id ?? `new-${index}`} className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                          Project {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            updateForm({
                              portfolioProjects: form.portfolioProjects.filter((_, i) => i !== index),
                            })
                          }
                          className="text-[10px] font-black uppercase text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          value={project.title}
                          onChange={(e) => updatePortfolio(index, { title: e.target.value })}
                          placeholder="Project title"
                          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold"
                        />
                        <input
                          value={project.project_url}
                          onChange={(e) => updatePortfolio(index, { project_url: e.target.value })}
                          placeholder="Project link (optional)"
                          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium"
                        />
                        <textarea
                          value={project.short_description}
                          onChange={(e) => updatePortfolio(index, { short_description: e.target.value })}
                          placeholder="Short description"
                          rows={2}
                          className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
                        />
                        <textarea
                          value={project.detailed_description}
                          onChange={(e) => updatePortfolio(index, { detailed_description: e.target.value })}
                          placeholder="Detailed description"
                          rows={3}
                          className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
                        />
                        <div className="md:col-span-2">
                          <input
                            type="file"
                            multiple
                            onChange={(e) =>
                              updatePortfolio(index, {
                                pendingFiles: [...project.pendingFiles, ...Array.from(e.target.files ?? [])],
                              })
                            }
                            className="text-xs"
                          />
                          {(project.media_files.length > 0 || project.pendingFiles.length > 0) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {project.media_files.map((file) => (
                                <span
                                  key={file.url}
                                  className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"
                                >
                                  {file.name}
                                </span>
                              ))}
                              {project.pendingFiles.map((file) => (
                                <span
                                  key={`${file.name}-${file.size}`}
                                  className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"
                                >
                                  {file.name} (pending)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">FAQs</h3>
                  <button
                    type="button"
                    onClick={() => updateForm({ faqs: [...form.faqs, { question: "", answer: "" }] })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600"
                  >
                    + Add FAQ
                  </button>
                </div>
                <div className="space-y-3">
                  {form.faqs.map((faq, index) => (
                    <div key={`faq-${index}`} className="rounded-2xl border border-slate-200 p-4">
                      <input
                        value={faq.question}
                        onChange={(e) => {
                          const next = [...form.faqs];
                          next[index] = { ...next[index], question: e.target.value };
                          updateForm({ faqs: next });
                        }}
                        placeholder="Question"
                        className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const next = [...form.faqs];
                          next[index] = { ...next[index], answer: e.target.value };
                          updateForm({ faqs: next });
                        }}
                        placeholder="Answer"
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              disabled={step === 4 || saving || uploading}
              onClick={() => void handleSaveAndNext()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save & Next"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void handleSave(false)}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void handleSave(true)}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish Service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
