"use client";

import React from "react";
import Image from "@/components/RemoteImage";
import {
  formatPortfolioDate,
  getProjectFullDescription,
  getProjectLinks,
} from "@/lib/portfolio";
import { isDisplayableImageUrl } from "@/lib/images";
import type { PortfolioMediaFile, PortfolioProject } from "@/types/marketplace";

type PortfolioProjectDetailModalProps = {
  project: PortfolioProject;
  isOwner?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function PortfolioMediaPreview({ file }: { file: PortfolioMediaFile }) {
  const isImage = file.type?.startsWith("image/") || isDisplayableImageUrl(file.url);
  const isVideo = file.type?.startsWith("video/");

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
    >
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {isImage ? (
          <Image src={file.url} alt={file.name || "File"} fill sizes="56px" className="object-cover" />
        ) : isVideo ? (
          <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v16z"
            />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-800">{file.name || "Uploaded File"}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          {file.type?.split("/").pop() || "File"}
        </p>
      </div>
      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-blue-600 group-hover:text-blue-700">
        {isImage ? "Preview" : "Download"}
      </span>
    </a>
  );
}

export default function PortfolioProjectDetailModal({
  project,
  isOwner = false,
  onClose,
  onEdit,
  onDelete,
}: PortfolioProjectDetailModalProps) {
  const links = getProjectLinks(project);
  const fullDescription = getProjectFullDescription(project);
  const hasAdditionalInfo =
    project.ai_technologies?.length > 0 || Boolean(project.category?.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-detail-title"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="min-w-0 pr-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Portfolio Project
            </p>
            <h2 id="portfolio-detail-title" className="mt-1 text-xl font-black text-slate-900">
              {project.title}
            </h2>
            {project.created_at && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Created {formatPortfolioDate(project.created_at)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-white"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {fullDescription && (
            <section>
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {fullDescription}
              </p>
            </section>
          )}

          {links.length > 0 && (
            <section>
              <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Project Links
              </h3>
              <div className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <a
                    key={`${link.title}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    {link.title}
                    <span aria-hidden="true">→</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {project.media_files?.length > 0 && (
            <section>
              <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Uploaded Files
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {project.media_files.map((file, idx) => (
                  <PortfolioMediaPreview key={`${file.url}-${idx}`} file={file} />
                ))}
              </div>
            </section>
          )}

          {hasAdditionalInfo && (
            <section>
              <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Additional Info
              </h3>
              <div className="space-y-3">
                {project.category?.trim() && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Category
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-700">{project.category}</p>
                  </div>
                )}
                {project.ai_technologies?.length > 0 && (
                  <div>
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      AI Technologies
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.ai_technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-blue-700"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {isOwner && (onEdit || onDelete) && (
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-600 transition-colors hover:bg-red-50"
              >
                Delete
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600"
              >
                Edit Project
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
