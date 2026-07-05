"use client";

import React, { useState } from "react";
import PortfolioProjectDetailModal from "@/components/portfolio/PortfolioProjectDetailModal";
import PortfolioProjectFormModal from "@/components/portfolio/PortfolioProjectFormModal";
import { deletePortfolioProject, usePortfolioProjects } from "@/lib/portfolio";
import type { PortfolioProject } from "@/types/marketplace";

type PortfolioSectionProps = {
  builderId: string;
  isOwner?: boolean;
  variant?: "profile" | "dashboard";
  showHeader?: boolean;
  className?: string;
};

export default function PortfolioSection({
  builderId,
  isOwner = false,
  variant = "profile",
  showHeader = true,
  className = "",
}: PortfolioSectionProps) {
  const { projects, loading, reload } = usePortfolioProjects(builderId);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [viewingProject, setViewingProject] = useState<PortfolioProject | null>(null);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormModalOpen(true);
  };

  const openEditModal = (project: PortfolioProject) => {
    setViewingProject(null);
    setEditingProject(project);
    setFormModalOpen(true);
  };

  const handleDelete = async (project: PortfolioProject) => {
    if (!window.confirm(`Delete "${project.title}" from your portfolio?`)) return;
    await deletePortfolioProject(project.id);
    setViewingProject(null);
    await reload();
  };

  const isDashboard = variant === "dashboard";

  return (
    <section id="portfolio" className={`scroll-mt-28 ${className}`}>
      {showHeader && (
        <div
          className={`mb-6 flex items-center justify-between gap-4 ${
            isDashboard ? "" : "border-b border-slate-100 pb-4"
          }`}
        >
          <div>
            <h2
              className={
                isDashboard
                  ? "text-3xl font-black text-slate-900"
                  : "text-lg font-black uppercase tracking-widest text-slate-900"
              }
            >
              {isDashboard ? "Portfolio Projects" : "Portfolio"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isDashboard
                ? "Showcase completed work and AI builds."
                : "Showcase work, demos, and uploaded deliverables"}
            </p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={openCreateModal}
              className={`shrink-0 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-colors ${
                isDashboard
                  ? "bg-slate-900 hover:bg-blue-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              + Add Project
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading portfolio...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            No portfolio projects yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            {isOwner
              ? "Add portfolio projects to showcase your best work to potential buyers."
              : "This builder has not added portfolio projects yet."}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600"
            >
              Add Your First Project
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-slate-900 sm:text-base">{project.title}</h3>
                {project.short_description && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {project.short_description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
                <button
                  type="button"
                  onClick={() => setViewingProject(project)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
                >
                  View Project
                </button>
                {isOwner && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(project)}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(project)}
                      className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewingProject && (
        <PortfolioProjectDetailModal
          project={viewingProject}
          isOwner={isOwner}
          onClose={() => setViewingProject(null)}
          onEdit={isOwner ? () => openEditModal(viewingProject) : undefined}
          onDelete={isOwner ? () => handleDelete(viewingProject) : undefined}
        />
      )}

      <PortfolioProjectFormModal
        builderId={builderId}
        open={formModalOpen}
        editingProject={editingProject}
        onClose={() => {
          setFormModalOpen(false);
          setEditingProject(null);
        }}
        onSaved={reload}
      />
    </section>
  );
}
