import type { DeliveryModel, PricingMode, ServiceFAQ, ServiceStatus } from "@/types/marketplace";
import { computeCapabilityFlags } from "@/lib/solutions/capabilities";

export const SERVICE_CATEGORIES = [
  "Generative AI",
  "AI Agents",
  "RAG",
  "Automation",
  "Computer Vision",
  "NLP",
  "AI Consulting",
  "Content Creation",
  "Prompt Libraries",
  "Workflows & Templates",
  "APIs & Integrations",
  "Other",
] as const;

export type ServiceFormState = {
  title: string;
  short_description: string;
  detailed_description: string;
  category: string;
  ai_skills: string[];
  tags: string[];
  pricing_mode: PricingMode;
  delivery_model: DeliveryModel;
  starting_price_usd: number;
  delivery_time_days: number;
  included_revisions: number;
  extra_revision_price_usd: number;
  whats_included: string[];
  requirements_from_buyer: string;
  fulfillment_payload_text: string;
  fulfillment_payload_url: string;
  faqs: ServiceFAQ[];
  cover_image_url: string;
  banner_image_url: string;
  gallery_urls: string[];
  demo_video_url: string;
  /** IDs of profile portfolio projects to showcase with this AI Solution */
  portfolioProjectIds: string[];
  /** Existing download file metadata when editing */
  existingDownload: {
    bucket: string | null;
    path: string | null;
    name: string | null;
    size: number | null;
    content_type: string | null;
  } | null;
  /** Pending download file to upload on save */
  pendingDownloadFile: File | null;
};

export const EMPTY_SERVICE_FORM: ServiceFormState = {
  title: "",
  short_description: "",
  detailed_description: "",
  category: SERVICE_CATEGORIES[0],
  ai_skills: [],
  tags: [],
  pricing_mode: "paid",
  delivery_model: "collaborative",
  starting_price_usd: 150,
  delivery_time_days: 7,
  included_revisions: 1,
  extra_revision_price_usd: 25,
  whats_included: [],
  requirements_from_buyer: "",
  fulfillment_payload_text: "",
  fulfillment_payload_url: "",
  faqs: [],
  cover_image_url: "",
  banner_image_url: "",
  gallery_urls: [],
  demo_video_url: "",
  portfolioProjectIds: [],
  existingDownload: null,
  pendingDownloadFile: null,
};

export type ServiceValidationResult = {
  valid: boolean;
  errors: string[];
};

function hasFulfillmentContent(form: ServiceFormState): boolean {
  return Boolean(
    form.fulfillment_payload_text.trim() ||
      form.fulfillment_payload_url.trim() ||
      form.pendingDownloadFile ||
      form.existingDownload?.path
  );
}

export function validateServiceForm(
  form: ServiceFormState,
  mode: "draft" | "publish"
): ServiceValidationResult {
  const errors: string[] = [];

  if (!form.title.trim()) errors.push("AI Solution title is required.");
  if (!form.category.trim()) errors.push("Category is required.");

  if (form.fulfillment_payload_text.trim() && form.fulfillment_payload_url.trim()) {
    errors.push("Use either Secure Text or Secure URL for fulfillment, not both.");
  }

  if (mode === "publish") {
    if (!form.short_description.trim()) errors.push("Short description is required to publish.");
    if (!form.detailed_description.trim() || form.detailed_description.trim().length < 40) {
      errors.push("Detailed description must be at least 40 characters to publish.");
    }
    if (!form.cover_image_url.trim()) {
      errors.push("Thumbnail image is required to publish.");
    }

    if (form.pricing_mode === "free") {
      if (form.starting_price_usd !== 0) {
        errors.push("Open-source solutions must be priced at $0.");
      }
    } else if (form.delivery_model === "instant") {
      if (!Number.isFinite(form.starting_price_usd) || form.starting_price_usd < 2) {
        errors.push("Premium instant solutions must be priced at $2 or higher.");
      }
    } else if (!Number.isFinite(form.starting_price_usd) || form.starting_price_usd < 6) {
      errors.push("Premium collaborative solutions must be priced at at least $6.");
    }

    if (form.delivery_model === "collaborative") {
      if (!Number.isFinite(form.delivery_time_days) || form.delivery_time_days < 1) {
        errors.push("Delivery time must be at least 1 day for collaborative solutions.");
      }
    }

    if (form.delivery_model === "instant" && !hasFulfillmentContent(form)) {
      // Instant solutions without fulfillment still allowed (info-only listings)
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
    pricing_mode?: PricingMode | string | null;
    delivery_model?: DeliveryModel | string | null;
    starting_price_usd: number;
    delivery_time_days: number;
    included_revisions: number;
    extra_revision_price_usd: number;
    whats_included?: string[] | null;
    requirements_from_buyer?: string | null;
    fulfillment_payload_text?: string | null;
    fulfillment_payload_url?: string | null;
    faqs?: ServiceFAQ[] | null;
    cover_image_url?: string | null;
    banner_image_url?: string | null;
    gallery_urls?: string[] | null;
    demo_video_url?: string | null;
    download_bucket?: string | null;
    download_file_path?: string | null;
    download_file_name?: string | null;
    download_file_size?: number | null;
    download_content_type?: string | null;
  },
  portfolioProjectIds: string[] = []
): ServiceFormState {
  const price = Number(service.starting_price_usd);
  const pricingMode: PricingMode =
    service.pricing_mode === "free" || price === 0 ? "free" : "paid";
  const deliveryModel: DeliveryModel =
    service.delivery_model === "instant" ? "instant" : "collaborative";

  return {
    title: service.title,
    short_description: service.short_description || "",
    detailed_description: service.detailed_description || "",
    category: service.category || SERVICE_CATEGORIES[0],
    ai_skills: service.ai_skills || [],
    tags: service.tags || [],
    pricing_mode: pricingMode,
    delivery_model: deliveryModel,
    starting_price_usd: pricingMode === "free" ? 0 : price,
    delivery_time_days: service.delivery_time_days,
    included_revisions: service.included_revisions,
    extra_revision_price_usd: Number(service.extra_revision_price_usd),
    whats_included: service.whats_included || [],
    requirements_from_buyer: service.requirements_from_buyer || "",
    fulfillment_payload_text: service.fulfillment_payload_text || "",
    fulfillment_payload_url: service.fulfillment_payload_url || "",
    faqs: service.faqs || [],
    cover_image_url: service.cover_image_url || "",
    banner_image_url: service.banner_image_url || "",
    gallery_urls: service.gallery_urls || [],
    demo_video_url: service.demo_video_url || "",
    portfolioProjectIds,
    existingDownload: service.download_file_path
      ? {
          bucket: service.download_bucket ?? null,
          path: service.download_file_path ?? null,
          name: service.download_file_name ?? null,
          size: service.download_file_size ?? null,
          content_type: service.download_content_type ?? null,
        }
      : null,
    pendingDownloadFile: null,
  };
}

export function formStateToServiceInput(form: ServiceFormState, status?: ServiceStatus) {
  const isFree = form.pricing_mode === "free";
  const capabilityFlags = computeCapabilityFlags({
    delivery_model: form.delivery_model,
    fulfillment_payload_text: form.fulfillment_payload_text,
    fulfillment_payload_url: form.fulfillment_payload_url,
    existingDownload: form.existingDownload,
    pendingDownloadFile: form.pendingDownloadFile,
  });
  return {
    title: form.title.trim(),
    short_description: form.short_description.trim() || null,
    detailed_description: form.detailed_description.trim() || null,
    category: form.category,
    ai_skills: form.ai_skills,
    tags: form.tags,
    pricing_mode: form.pricing_mode,
    delivery_model: form.delivery_model,
    capability_instant_download: capabilityFlags.capability_instant_download,
    capability_secure_delivery: capabilityFlags.capability_secure_delivery,
    starting_price_usd: isFree ? 0 : form.starting_price_usd,
    delivery_time_days: form.delivery_time_days,
    included_revisions: form.included_revisions,
    extra_revision_price_usd: form.extra_revision_price_usd,
    whats_included: form.whats_included.filter(Boolean),
    requirements_from_buyer: form.requirements_from_buyer.trim() || null,
    fulfillment_payload_text: form.fulfillment_payload_text.trim() || null,
    fulfillment_payload_url: form.fulfillment_payload_url.trim() || null,
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
