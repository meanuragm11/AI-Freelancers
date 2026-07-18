"use client";

import React, { useState } from "react";
import PortfolioProjectFormModal from "@/components/portfolio/PortfolioProjectFormModal";
import { usePortfolioProjects } from "@/lib/portfolio";
import type { PortfolioProject } from "@/types/marketplace";

type ServicePortfolioPickerProps = {
  builderId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export default function ServicePortfolioPicker({
  builderId,
  selectedIds,
  onChange,
}: ServicePortfolioPickerProps) {
  const { projects, loading, reload } = usePortfolioProjects(builderId);
  const [formModalOpen, setFormModalOpen] = useState(false);

  const toggleProject = (projectId: string) => {
    if (selectedIds.includes(projectId)) {
      onChange(selectedIds.filter((id) => id !== projectId));
    } else {
      onChange([...selectedIds, projectId]);
    }
  };

  const handleProjectSaved = (project?: PortfolioProject) => {
    void reload();
    if (project && !selectedIds.includes(project.id)) {
      onChange([...selectedIds, project.id]);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900">Portfolio / Project Examples</h3>
          <p className="text-xs text-slate-500">
            Select projects from your profile portfolio to showcase with this AI Solution.
          </p>
        </div>
        {projects.length > 0 && (
          <button
            type="button"
            onClick={() => setFormModalOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
          >
            + Add Project
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading portfolio...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-sm text-slate-600">
            No portfolio projects found. Add your first project to showcase your work.
          </p>
          <button
            type="button"
            onClick={() => setFormModalOpen(true)}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600"
          >
            Add Project
          </button>
        </div>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {projects.map((project) => {
            const checked = selectedIds.includes(project.id);
            return (
              <label
                key={project.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                  checked
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProject(project.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="min-w-0 truncate text-sm font-black text-slate-900">
                  {project.title}
                </span>
              </label>
            );
          })}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      <PortfolioProjectFormModal
        builderId={builderId}
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSaved={handleProjectSaved}
        overlayClassName="z-[110]"
      />
    </div>
  );
}
