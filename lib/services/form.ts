import type { ServiceFAQ, ServiceStatus } from "@/types/marketplace";

export const SERVICE_CATEGORIES = [
  "Generative AI",
  "AI Agents",
  "RAG",
  "Automation",
  "Computer Vision",
  "NLP",
  "AI Consulting",
  "Content Creation",
  "Other",
] as const;

export type ServiceFormPortfolioProject = {
  id?: string;
  title: string;
  short_description: string;
  detailed_description: string;
  project_url: string;
  media_files: { type: string; url: string; name: string }[];
  pendingFiles: File[];
};

export type ServiceFormState = {
  title: string;
  short_description: string;
  detailed_description: string;
  category: string;
  ai_skills: string[];
  tags: string[];
  starting_price_usd: number;
  delivery_time_days: number;
  included_revisions: number;
  extra_revision_price_usd: number;
  whats_included: string[];
  requirements_from_buyer: string;
  faqs: ServiceFAQ[];
  cover_image_url: string;
  banner_image_url: string;
  gallery_urls: string[];
  demo_video_url: string;
  portfolioProjects: ServiceFormPortfolioProject[];
};

export const EMPTY_SERVICE_FORM: ServiceFormState = {
  title: "",
  short_description: "",
  detailed_description: "",
  category: SERVICE_CATEGORIES[0],
  ai_skills: [],
  tags: [],
  starting_price_usd: 150,
  delivery_time_days: 7,
  included_revisions: 1,
  extra_revision_price_usd: 25,
  whats_included: [],
  requirements_from_buyer: "",
  faqs: [],
  cover_image_url: "",
  banner_image_url: "",
  gallery_urls: [],
  demo_video_url: "",
  portfolioProjects: [],
};

export type ServiceValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateServiceForm(
  form: ServiceFormState,
  mode: "draft" | "publish"
): ServiceValidationResult {
  const errors: string[] = [];

  if (!form.title.trim()) errors.push("Service title is required.");
  if (!form.category.trim()) errors.push("Category is required.");

  if (mode === "publish") {
    if (!form.short_description.trim()) errors.push("Short description is required to publish.");
    if (!form.detailed_description.trim() || form.detailed_description.trim().length < 40) {
      errors.push("Detailed description must be at least 40 characters to publish.");
    }
    if (!Number.isFinite(form.starting_price_usd) || form.starting_price_usd < 6) {
      errors.push("Fixed price must be at least $6 to publish.");
    }
    if (!Number.isFinite(form.delivery_time_days) || form.delivery_time_days < 1) {
      errors.push("Delivery time must be at least 1 day.");
    }
    if (!form.cover_image_url.trim()) {
      errors.push("Thumbnail image is required to publish.");
    }
  }

  if (form.starting_price_usd < 0) errors.push("Price cannot be negative.");
  if (form.delivery_time_days < 0) errors.push("Delivery time cannot be negative.");

  return { valid: errors.length === 0, errors };
}

export function serviceToFormState(
  service: {
    title: string;
    short_description?: string | null;
    detailed_description?: string | null;
    category?: string | null;
    ai_skills?: string[] | null;
    tags?: string[] | null;
    starting_price_usd: number;
    delivery_time_days: number;
    included_revisions: number;
    extra_revision_price_usd: number;
    whats_included?: string[] | null;
    requirements_from_buyer?: string | null;
    faqs?: ServiceFAQ[] | null;
    cover_image_url?: string | null;
    banner_image_url?: string | null;
    gallery_urls?: string[] | null;
    demo_video_url?: string | null;
  },
  portfolioProjects: ServiceFormPortfolioProject[] = []
): ServiceFormState {
  return {
    title: service.title,
    short_description: service.short_description || "",
    detailed_description: service.detailed_description || "",
    category: service.category || SERVICE_CATEGORIES[0],
    ai_skills: service.ai_skills || [],
    tags: service.tags || [],
    starting_price_usd: Number(service.starting_price_usd),
    delivery_time_days: service.delivery_time_days,
    included_revisions: service.included_revisions,
    extra_revision_price_usd: Number(service.extra_revision_price_usd),
    whats_included: service.whats_included || [],
    requirements_from_buyer: service.requirements_from_buyer || "",
    faqs: service.faqs || [],
    cover_image_url: service.cover_image_url || "",
    banner_image_url: service.banner_image_url || "",
    gallery_urls: service.gallery_urls || [],
    demo_video_url: service.demo_video_url || "",
    portfolioProjects,
  };
}

export function formStateToServiceInput(form: ServiceFormState, status?: ServiceStatus) {
  return {
    title: form.title.trim(),
    short_description: form.short_description.trim() || null,
    detailed_description: form.detailed_description.trim() || null,
    category: form.category,
    ai_skills: form.ai_skills,
    tags: form.tags,
    starting_price_usd: form.starting_price_usd,
    delivery_time_days: form.delivery_time_days,
    included_revisions: form.included_revisions,
    extra_revision_price_usd: form.extra_revision_price_usd,
    whats_included: form.whats_included.filter(Boolean),
    requirements_from_buyer: form.requirements_from_buyer.trim() || null,
    faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    cover_image_url: form.cover_image_url || null,
    banner_image_url: form.banner_image_url || null,
    gallery_urls: form.gallery_urls,
    demo_video_url: form.demo_video_url.trim() || null,
    ...(status ? { status } : {}),
  };
}

export function statusLabel(status: ServiceStatus) {
  switch (status) {
    case "published":
      return "Published";
    case "paused":
      return "Unpublished";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
}

export function statusBadgeClass(status: ServiceStatus) {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "paused":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "archived":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
