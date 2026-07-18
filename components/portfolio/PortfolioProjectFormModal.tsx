"use client";

import React, { useEffect, useState } from "react";
import {
  createPortfolioProject,
  updatePortfolioProject,
  EMPTY_PORTFOLIO_FORM,
  formToPortfolioInput,
  LINK_TITLE_SUGGESTIONS,
  projectToFormState,
  hasValidPortfolioProof,
  validatePortfolioForm,
  type PortfolioFormState,
} from "@/lib/portfolio";
import { uploadMarketplaceFile } from "@/lib/storage/upload";
import type { PortfolioProject } from "@/types/marketplace";

type PortfolioProjectFormModalProps = {
  builderId: string;
  open: boolean;
  editingProject?: PortfolioProject | null;
  onClose: () => void;
  onSaved: (project?: PortfolioProject) => void;
  overlayClassName?: string;
};

export default function PortfolioProjectFormModal({
  builderId,
  open,
  editingProject = null,
  onClose,
  onSaved,
  overlayClassName = "z-50",
}: PortfolioProjectFormModalProps) {
  const [form, setForm] = useState<PortfolioFormState>(EMPTY_PORTFOLIO_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editingProject ? projectToFormState(editingProject) : EMPTY_PORTFOLIO_FORM);
    setError(null);
  }, [open, editingProject]);

  if (!open) return null;

  const validation = validatePortfolioForm(form);
  const needsProof = !hasValidPortfolioProof(form);

  const updateLink = (index: number, field: "title" | "url", value: string) => {
    const links = form.links.map((link, i) => (i === index ? { ...link, [field]: value } : link));
    setForm({ ...form, links });
  };

  const addLink = () => {
    setForm({
      ...form,
      links: [...form.links, { title: "Project Link", url: "" }],
    });
  };

  const removeLink = (index: number) => {
    if (form.links.length <= 1) return;
    setForm({ ...form, links: form.links.filter((_, i) => i !== index) });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const uploaded = [...form.media_files];
    for (const file of files) {
      const url = await uploadMarketplaceFile(builderId, "portfolio", file);
      uploaded.push({ type: file.type, url, name: file.name });
    }
    setForm({ ...form, media_files: uploaded, pendingFiles: [...form.pendingFiles, ...files] });
    e.target.value = "";
  };

  const removeMediaFile = (index: number) => {
    setForm({
      ...form,
      media_files: form.media_files.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = formToPortfolioInput(form);
      if (editingProject) {
        const updated = await updatePortfolioProject(editingProject.id, input);
        onSaved(updated);
      } else {
        const created = await createPortfolioProject(builderId, input);
        onSaved(created);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save project";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm ${overlayClassName}`}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 p-6">
          <h3 className="text-lg font-black text-slate-900">
            {editingProject ? "Edit Portfolio Project" : "Add Portfolio Project"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-8">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Project Title *
            </label>
            <input
              required
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="AI Chatbot for Healthcare"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Short Description *
            </label>
            <textarea
              required
              rows={3}
              value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
              placeholder="Brief summary of the project and your role"
            />
          </div>

          <div>
            <p className="mb-3 text-xs text-slate-500">
              Add at least one project URL or upload at least one file.
            </p>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Project URL(s)
              </label>
              <button
                type="button"
                onClick={addLink}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
              >
                + Add Link
              </button>
            </div>
            <div className="space-y-3">
              {form.links.map((link, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                    <input
                      list={`portfolio-link-titles-${index}`}
                      value={link.title}
                      onChange={(e) => updateLink(index, "title", e.target.value)}
                      placeholder="Link title"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                    />
                    <datalist id={`portfolio-link-titles-${index}`}>
                      {LINK_TITLE_SUGGESTIONS.map((title) => (
                        <option key={title} value={title} />
                      ))}
                    </datalist>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateLink(index, "url", e.target.value)}
                      placeholder="https://..."
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      disabled={form.links.length <= 1}
                      className="rounded-lg px-2 text-xs font-black uppercase text-slate-400 hover:text-red-500 disabled:opacity-30"
                      aria-label="Remove link"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Upload Files
            </label>
            <input
              type="file"
              multiple
              onChange={handleMediaUpload}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-white"
            />
            {form.media_files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.media_files.map((file, index) => (
                  <span
                    key={`${file.url}-${index}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
                  >
                    📎 {file.name || "File"}
                    <button
                      type="button"
                      onClick={() => removeMediaFile(index)}
                      className="text-slate-400 hover:text-red-500"
                      aria-label={`Remove ${file.name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {(error || needsProof) && (
            <p className="text-sm font-medium text-red-600">
              {error ?? "Please add at least one Project URL or upload at least one file."}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-black uppercase text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !validation.valid}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingProject ? "Update Project" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
