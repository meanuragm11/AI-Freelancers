import { supabase } from "@/lib/supabaseClient";
import { formatDisplayName } from "@/lib/display/formatDisplayName";
import type {
  BuilderProfileView,
  BuilderPublishedComponent,
  BuilderPublishedService,
  CompletedProjectReview,
  ProfilePageData,
} from "@/types/profile";
import type { PortfolioProject } from "@/types/marketplace";

const PROFILE_SELECT =
  "id, full_name, headline, location, bio, tech_stack, external_projects, avatar_url, banner_url, is_verified, average_rating, review_count, average_response_hours, completed_projects, is_top_expert, created_at, languages, availability_status";

const SERVICE_SELECT =
  "id, title, short_description, starting_price_usd, delivery_time_days, cover_image_url, banner_image_url, rating_avg, review_count, order_count, category";

export async function fetchBuilderProfile(profileId: string): Promise<BuilderProfileView | null> {
  const { data, error } = await supabase
    .from("profiles_public")
    .select(PROFILE_SELECT)
    .eq("id", profileId)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    tech_stack: data.tech_stack ?? [],
    external_projects: data.external_projects ?? [],
    languages: data.languages ?? [],
    availability_status: data.availability_status ?? "available",
    average_rating: Number(data.average_rating ?? 0),
    review_count: Number(data.review_count ?? 0),
    completed_projects: Number(data.completed_projects ?? 0),
    is_verified: Boolean(data.is_verified),
    is_top_expert: Boolean(data.is_top_expert),
  } as BuilderProfileView;
}

export async function fetchBuilderPublishedServices(builderId: string): Promise<BuilderPublishedService[]> {
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("builder_id", builderId)
    .eq("status", "published")
    .order("order_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BuilderPublishedService[];
}

export async function fetchBuilderPublishedComponents(
  builderId: string
): Promise<BuilderPublishedComponent[]> {
  const { data, error } = await supabase
    .from("components")
    .select("id, title, category, thumbnail_url, price_usd, sales_count")
    .eq("builder_id", builderId)
    .eq("status", "published")
    .order("sales_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BuilderPublishedComponent[];
}

export async function fetchBuilderPortfolio(builderId: string): Promise<PortfolioProject[]> {
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select("*")
    .eq("builder_id", builderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PortfolioProject[];
}

export async function fetchBuilderWorkHistory(builderId: string): Promise<CompletedProjectReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id, rating, review, created_at, service_id, collab_id,
      buyer:profiles_public!buyer_id(full_name, avatar_url),
      collab:collabs!collab_id(title, fixed_price_usd, escrow_amount_usd, updated_at),
      service:services!service_id(title)
    `
    )
    .eq("builder_id", builderId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const buyer = row.buyer as { full_name?: string; avatar_url?: string | null } | null;
    const collab = row.collab as {
      title?: string;
      fixed_price_usd?: number;
      escrow_amount_usd?: number;
      updated_at?: string;
    } | null;
    const service = row.service as { title?: string } | null;

    const amount =
      collab?.escrow_amount_usd != null
        ? Number(collab.escrow_amount_usd)
        : collab?.fixed_price_usd != null
          ? Number(collab.fixed_price_usd)
          : null;

    return {
      id: row.id as string,
      rating: Number(row.rating ?? 0),
      review: (row.review as string) ?? "",
      created_at: row.created_at as string,
      service_name: service?.title || collab?.title || "Completed Project",
      buyer_name: buyer?.full_name ? formatDisplayName(buyer.full_name) : "Verified Buyer",
      buyer_avatar_url: buyer?.avatar_url ?? null,
      amount_usd: amount,
      completed_at: collab?.updated_at || (row.created_at as string),
    };
  });
}

export async function fetchProfilePageData(profileId: string): Promise<ProfilePageData | null> {
  const profile = await fetchBuilderProfile(profileId);
  if (!profile) return null;

  const [services, components, portfolioProjects, workHistory] = await Promise.all([
    fetchBuilderPublishedServices(profileId),
    fetchBuilderPublishedComponents(profileId),
    fetchBuilderPortfolio(profileId),
    fetchBuilderWorkHistory(profileId),
  ]);

  return {
    profile,
    services,
    components,
    portfolioProjects,
    workHistory,
    publishedServiceCount: services.length,
  };
}

export function getViewServicesHref(
  builderId: string,
  services: Pick<BuilderPublishedService, "id">[]
): string {
  if (services.length === 1) return `/service/${services[0].id}`;
  return `/profile/${builderId}#services`;
}

export async function incrementProfileViewsIfVisitor(expertId: string, isOwner: boolean) {
  if (!isOwner && expertId) {
    await supabase.rpc("increment_profile_views", { expert_id: expertId });
  }
}
