import type { PortfolioMediaFile, PortfolioProject, PortfolioProjectLink } from "@/types/marketplace";

export type PortfolioInput = Partial<
  Omit<PortfolioProject, "id" | "created_at" | "updated_at">
>;

export type PortfolioLinkInput = {
  title: string;
  url: string;
};

export type PortfolioFormState = {
  title: string;
  short_description: string;
  links: PortfolioLinkInput[];
  media_files: PortfolioMediaFile[];
  pendingFiles: File[];
};

export const LINK_TITLE_SUGGESTIONS = [
  "Live Demo",
  "GitHub",
  "Documentation",
  "Case Study",
  "Figma",
  "Video",
  "Project Link",
] as const;

export const EMPTY_PORTFOLIO_FORM: PortfolioFormState = {
  title: "",
  short_description: "",
  links: [{ title: "Live Demo", url: "" }],
  media_files: [],
  pendingFiles: [],
};

export type PortfolioValidationResult = {
  valid: boolean;
  errors: string[];
};

export function getProjectFullDescription(
  project: Pick<PortfolioProject, "detailed_description" | "short_description">
): string {
  return (project.detailed_description || project.short_description || "").trim();
}

export function formatPortfolioDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getProjectLinks(project: Pick<
  PortfolioProject,
  "links" | "live_demo_url" | "github_url" | "project_url"
>): PortfolioProjectLink[] {
  if (project.links?.length) {
    return project.links.filter((link) => link.url?.trim());
  }

  const legacy: PortfolioProjectLink[] = [];
  if (project.live_demo_url?.trim()) {
    legacy.push({ title: "Live Demo", url: project.live_demo_url.trim() });
  }
  if (project.github_url?.trim()) {
    legacy.push({ title: "GitHub", url: project.github_url.trim() });
  }
  if (project.project_url?.trim()) {
    legacy.push({ title: "Project", url: project.project_url.trim() });
  }
  return legacy;
}

export function projectToFormState(project: PortfolioProject): PortfolioFormState {
  const links = getProjectLinks(project);
  return {
    title: project.title,
    short_description: project.short_description || "",
    links: links.length > 0 ? links.map((l) => ({ title: l.title, url: l.url })) : [{ title: "Live Demo", url: "" }],
    media_files: project.media_files || [],
    pendingFiles: [],
  };
}

export function validatePortfolioForm(form: PortfolioFormState): PortfolioValidationResult {
  const errors: string[] = [];

  if (!form.title.trim()) {
    errors.push("Project title is required.");
  }
  if (!form.short_description.trim()) {
    errors.push("Short description is required.");
  }

  const validLinks = form.links.filter((link) => link.title.trim() && link.url.trim());
  if (validLinks.length === 0) {
    errors.push("At least one project link with a title and URL is required.");
  }

  for (const link of form.links) {
    const hasTitle = Boolean(link.title.trim());
    const hasUrl = Boolean(link.url.trim());
    if (hasTitle !== hasUrl) {
      errors.push("Each link must include both a title and a URL.");
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

function findLinkTitle(links: PortfolioProjectLink[], titles: string[]): string | null {
  const match = links.find((link) =>
    titles.some((title) => link.title.toLowerCase() === title.toLowerCase())
  );
  return match?.url ?? null;
}

export function formToPortfolioInput(form: PortfolioFormState): PortfolioInput {
  const links: PortfolioProjectLink[] = form.links
    .filter((link) => link.title.trim() && link.url.trim())
    .map((link) => ({
      title: link.title.trim(),
      url: link.url.trim(),
    }));

  return {
    title: form.title.trim(),
    short_description: form.short_description.trim(),
    links,
    live_demo_url: findLinkTitle(links, ["Live Demo", "Demo"]),
    github_url: findLinkTitle(links, ["GitHub"]),
    project_url: links[0]?.url ?? null,
    media_files: form.media_files,
  };
}
