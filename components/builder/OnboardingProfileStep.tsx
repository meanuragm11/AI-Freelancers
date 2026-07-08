"use client";

import React, { useState } from "react";
import {
  LINK_TITLE_SUGGESTIONS,
  type PortfolioFormState,
} from "@/lib/portfolio";
import { uploadMarketplaceFile } from "@/lib/storage/upload";
import {
  createEmptyPortfolioProject,
  ONBOARDING_COUNTRIES,
  ONBOARDING_SKILL_SUGGESTIONS,
  type OnboardingProfileState,
} from "@/lib/onboarding/profile";

type OnboardingProfileStepProps = {
  builderId: string;
  profile: OnboardingProfileState;
  onChange: (profile: OnboardingProfileState) => void;
};

export default function OnboardingProfileStep({
  builderId,
  profile,
  onChange,
}: OnboardingProfileStepProps) {
  const [selectedSkill, setSelectedSkill] = useState<string>(ONBOARDING_SKILL_SUGGESTIONS[0]);
  const [customSkill, setCustomSkill] = useState("");
  const [expandedProject, setExpandedProject] = useState<number | null>(
    profile.portfolioProjects.length > 0 ? 0 : null
  );
  const [uploadingProjectIndex, setUploadingProjectIndex] = useState<number | null>(null);

  const updateProfile = (patch: Partial<OnboardingProfileState>) => {
    onChange({ ...profile, ...patch });
  };

  const addSkill = () => {
    const skill = selectedSkill === "Other (Custom)" ? customSkill.trim() : selectedSkill;
    if (!skill) return;
    if (profile.tech_stack.includes(skill)) return;
    updateProfile({ tech_stack: [...profile.tech_stack, skill] });
    setCustomSkill("");
  };

  const updateProject = (index: number, patch: Partial<PortfolioFormState>) => {
    const next = profile.portfolioProjects.map((project, i) =>
      i === index ? { ...project, ...patch } : project
    );
    updateProfile({ portfolioProjects: next });
  };

  const updateProjectLink = (
    projectIndex: number,
    linkIndex: number,
    field: "title" | "url",
    value: string
  ) => {
    const project = profile.portfolioProjects[projectIndex];
    const links = project.links.map((link, i) =>
      i === linkIndex ? { ...link, [field]: value } : link
    );
    updateProject(projectIndex, { links });
  };

  const addProjectLink = (projectIndex: number) => {
    const project = profile.portfolioProjects[projectIndex];
    updateProject(projectIndex, {
      links: [...project.links, { title: "Project Link", url: "" }],
    });
  };

  const removeProjectLink = (projectIndex: number, linkIndex: number) => {
    const project = profile.portfolioProjects[projectIndex];
    if (project.links.length <= 1) return;
    updateProject(projectIndex, {
      links: project.links.filter((_, i) => i !== linkIndex),
    });
  };

  const addProject = () => {
    const next = [...profile.portfolioProjects, createEmptyPortfolioProject()];
    updateProfile({ portfolioProjects: next });
    setExpandedProject(next.length - 1);
  };

  const removeProject = (index: number) => {
    updateProfile({
      portfolioProjects: profile.portfolioProjects.filter((_, i) => i !== index),
    });
    setExpandedProject(null);
  };

  const handleProjectMediaUpload = async (
    projectIndex: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploadingProjectIndex(projectIndex);
    try {
      const project = profile.portfolioProjects[projectIndex];
      const uploaded = [...project.media_files];
      for (const file of files) {
        const url = await uploadMarketplaceFile(builderId, "portfolio", file);
        uploaded.push({ type: file.type, url, name: file.name });
      }
      updateProject(projectIndex, {
        media_files: uploaded,
        pendingFiles: [...project.pendingFiles, ...files],
      });
    } finally {
      setUploadingProjectIndex(null);
      event.target.value = "";
    }
  };

  const removeProjectMedia = (projectIndex: number, mediaIndex: number) => {
    const project = profile.portfolioProjects[projectIndex];
    updateProject(projectIndex, {
      media_files: project.media_files.filter((_, i) => i !== mediaIndex),
    });
  };

  return (
    <div className="animate-in fade-in flex-1 space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Step 1</p>
        <h2 className="mt-1 text-xl font-black text-slate-900">Professional Profile</h2>
        <p className="mt-2 text-sm text-slate-500">
          Tell buyers who you are, what you build, and showcase your best work before listing your first service.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="full_name" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="full_name"
              type="text"
              value={profile.full_name}
              onChange={(e) => updateProfile({ full_name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="location" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              id="location"
              value={profile.location}
              onChange={(e) => updateProfile({ location: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-blue-500"
            >
              {ONBOARDING_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="headline" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Professional Headline <span className="text-red-500">*</span>
          </label>
          <input
            id="headline"
            type="text"
            value={profile.headline}
            onChange={(e) => updateProfile({ headline: e.target.value })}
            placeholder="e.g., Senior AI Engineer · RAG & Agent Systems"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="bio" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Professional Bio <span className="text-red-500">*</span>
          </label>
          <textarea
            id="bio"
            rows={5}
            value={profile.bio}
            onChange={(e) => updateProfile({ bio: e.target.value })}
            placeholder="Share your background, specialties, and the kinds of AI projects you deliver."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-colors focus:border-blue-500"
          />
          <p className="mt-1 text-[10px] font-medium text-slate-400">
            This bio pre-fills your first service description so you do not repeat yourself.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Skills <span className="text-red-500">*</span>
          </label>
          <div className="mb-4 flex min-h-[60px] flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
            {profile.tech_stack.length === 0 ? (
              <span className="text-xs font-bold text-slate-400">Add skills that describe your expertise.</span>
            ) : (
              profile.tech_stack.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm"
                >
                  {skill}
                  <button
                    type="button"
                    aria-label={`Remove ${skill}`}
                    onClick={() =>
                      updateProfile({ tech_stack: profile.tech_stack.filter((item) => item !== skill) })
                    }
                    className="transition-colors hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                aria-label="Select skill"
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black outline-none transition-colors focus:border-blue-500"
              >
                {ONBOARDING_SKILL_SUGGESTIONS.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addSkill}
                className="rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            {selectedSkill === "Other (Custom)" && (
              <input
                type="text"
                aria-label="Custom skill"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Enter custom skill..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-blue-500"
              />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Portfolio Projects</h3>
            <p className="text-xs text-slate-500">Optional but recommended. Saved to your expert profile for buyers to browse.</p>
          </div>
          <button
            type="button"
            onClick={addProject}
            className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600"
          >
            + Add Project
          </button>
        </div>

        {profile.portfolioProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
            <p className="text-sm font-bold text-slate-500">No projects yet. Add a case study or demo to stand out.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.portfolioProjects.map((project, projectIndex) => {
              const isExpanded = expandedProject === projectIndex;
              return (
                <div key={`project-${projectIndex}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedProject(isExpanded ? null : projectIndex)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {project.title.trim() || `Project ${projectIndex + 1}`}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {project.short_description.trim() || "Add title, description, links, and files"}
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {isExpanded ? "Hide" : "Edit"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Project Title
                        </label>
                        <input
                          type="text"
                          value={project.title}
                          onChange={(e) => updateProject(projectIndex, { title: e.target.value })}
                          placeholder="AI Chatbot for Healthcare"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Short Description
                        </label>
                        <textarea
                          rows={3}
                          value={project.short_description}
                          onChange={(e) => updateProject(projectIndex, { short_description: e.target.value })}
                          placeholder="Brief summary of the project and your role"
                          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Project Links
                          </label>
                          <button
                            type="button"
                            onClick={() => addProjectLink(projectIndex)}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                          >
                            + Add Link
                          </button>
                        </div>
                        <div className="space-y-3">
                          {project.links.map((link, linkIndex) => (
                            <div key={`link-${projectIndex}-${linkIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                                <input
                                  list={`portfolio-link-titles-${projectIndex}-${linkIndex}`}
                                  value={link.title}
                                  onChange={(e) =>
                                    updateProjectLink(projectIndex, linkIndex, "title", e.target.value)
                                  }
                                  placeholder="Link title"
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                />
                                <datalist id={`portfolio-link-titles-${projectIndex}-${linkIndex}`}>
                                  {LINK_TITLE_SUGGESTIONS.map((title) => (
                                    <option key={title} value={title} />
                                  ))}
                                </datalist>
                                <input
                                  type="url"
                                  value={link.url}
                                  onChange={(e) =>
                                    updateProjectLink(projectIndex, linkIndex, "url", e.target.value)
                                  }
                                  placeholder="https://..."
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeProjectLink(projectIndex, linkIndex)}
                                  disabled={project.links.length <= 1}
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
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Project Files (Optional)
                        </label>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.zip,.doc,.docx,image/*"
                          disabled={uploadingProjectIndex === projectIndex}
                          onChange={(e) => void handleProjectMediaUpload(projectIndex, e)}
                          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-white"
                        />
                        {project.media_files.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {project.media_files.map((file, mediaIndex) => (
                              <span
                                key={`${file.url}-${mediaIndex}`}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
                              >
                                {file.name || "File"}
                                <button
                                  type="button"
                                  onClick={() => removeProjectMedia(projectIndex, mediaIndex)}
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

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeProject(projectIndex)}
                          className="text-[10px] font-black uppercase tracking-widest text-rose-600"
                        >
                          Remove Project
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
