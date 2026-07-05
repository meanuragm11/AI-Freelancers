import { supabase } from "@/lib/supabaseClient";
import type { Service, ServiceStatus } from "@/types/marketplace";

const SERVICE_SELECT =
  "*, builder:profiles_public!builder_id(id, full_name, headline, avatar_url, banner_url, tech_stack, location, bio, is_verified, average_rating, review_count, average_response_hours, completed_projects, is_top_expert)";

export type ServiceInput = Partial<
  Omit<Service, "id" | "created_at" | "updated_at" | "view_count" | "order_count" | "rating_avg" | "review_count" | "builder">
>;

export async function listPublishedServices(filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  maxDeliveryDays?: number;
  skills?: string[];
  sort?: string;
  limit?: number;
}) {
  let query = supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("status", "published");

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.minPrice != null) query = query.gte("starting_price_usd", filters.minPrice);
  if (filters?.maxPrice != null) query = query.lte("starting_price_usd", filters.maxPrice);
  if (filters?.maxDeliveryDays != null)
    query = query.lte("delivery_time_days", filters.maxDeliveryDays);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(filters?.limit ?? 200);
  if (error) throw error;

  let results = (data ?? []) as Service[];

  if (filters?.skills?.length) {
    results = results.filter((s) =>
      filters.skills!.every((skill) => s.ai_skills?.includes(skill))
    );
  }

  if (filters?.sort === "price_low") {
    results.sort((a, b) => Number(a.starting_price_usd) - Number(b.starting_price_usd));
  } else if (filters?.sort === "price_high") {
    results.sort((a, b) => Number(b.starting_price_usd) - Number(a.starting_price_usd));
  } else if (filters?.sort === "rating") {
    results.sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg));
  } else if (filters?.sort === "newest") {
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return results;
}

export async function getServiceById(id: string) {
  const { data, error } = await supabase.from("services").select(SERVICE_SELECT).eq("id", id).single();
  if (error) throw error;
  return data as Service;
}

export async function listBuilderServices(builderId: string) {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("builder_id", builderId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function createService(builderId: string, input: ServiceInput) {
  const { data, error } = await supabase
    .from("services")
    .insert({ ...input, builder_id: builderId })
    .select()
    .single();
  if (error) throw error;
  return data as Service;
}

export async function updateService(id: string, input: ServiceInput) {
  const { data, error } = await supabase.from("services").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Service;
}

/**
 * Archives a service listing (soft delete). The listing is immediately removed from the
 * public marketplace (discover, search, arena, public profile) and can no longer be
 * purchased, but existing collabs, transactions, reviews, messages, and escrow records
 * that reference it are left completely untouched — buyers and the builder both keep
 * access to any active/completed order tied to the service.
 */
export async function archiveService(id: string) {
  const { error } = await supabase
    .from("services")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Restores a previously archived service back to draft so the builder can review and republish it. */
export async function restoreService(id: string) {
  const { error } = await supabase
    .from("services")
    .update({ status: "draft", archived_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function setServiceStatus(id: string, status: ServiceStatus) {
  return updateService(id, { status });
}

export async function duplicateService(id: string, builderId: string) {
  const original = await getServiceById(id);
  if (original.builder_id !== builderId) throw new Error("Not authorized");
  return createService(builderId, {
    title: `${original.title} (Copy)`,
    short_description: original.short_description,
    detailed_description: original.detailed_description,
    category: original.category,
    ai_skills: original.ai_skills,
    tags: original.tags,
    cover_image_url: original.cover_image_url,
    banner_image_url: original.banner_image_url,
    gallery_urls: original.gallery_urls,
    demo_video_url: original.demo_video_url,
    faqs: original.faqs,
    whats_included: original.whats_included,
    delivery_time_days: original.delivery_time_days,
    included_revisions: original.included_revisions,
    extra_revision_price_usd: original.extra_revision_price_usd,
    requirements_from_buyer: original.requirements_from_buyer,
    starting_price_usd: original.starting_price_usd,
    status: "draft",
  });
}

export async function incrementServiceViews(id: string) {
  await supabase.rpc("increment_service_views", { service_id: id });
}

export async function countPublishedServices(builderId: string) {
  const { count, error } = await supabase
    .from("services")
    .select("*", { count: "exact", head: true })
    .eq("builder_id", builderId)
    .eq("status", "published");
  if (error) throw error;
  return count ?? 0;
}
