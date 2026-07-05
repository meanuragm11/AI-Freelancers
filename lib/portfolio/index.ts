import { supabase } from "@/lib/supabaseClient";
import type { PortfolioInput } from "@/lib/portfolio/form";
import type { PortfolioProject } from "@/types/marketplace";

export {
  EMPTY_PORTFOLIO_FORM,
  LINK_TITLE_SUGGESTIONS,
  formatPortfolioDate,
  getProjectFullDescription,
  getProjectLinks,
  projectToFormState,
  validatePortfolioForm,
  formToPortfolioInput,
  type PortfolioFormState,
  type PortfolioInput,
  type PortfolioLinkInput,
} from "@/lib/portfolio/form";
export { usePortfolioProjects } from "@/lib/portfolio/usePortfolioProjects";

function normalizePortfolioProject(row: Record<string, unknown>): PortfolioProject {
  const { links, media_files, ai_technologies, ...rest } = row;
  return {
    ...(rest as Omit<PortfolioProject, "links" | "media_files" | "ai_technologies">),
    links: Array.isArray(links) ? (links as PortfolioProject["links"]) : [],
    media_files: Array.isArray(media_files)
      ? (media_files as PortfolioProject["media_files"])
      : [],
    ai_technologies: Array.isArray(ai_technologies)
      ? (ai_technologies as string[])
      : [],
  };
}

export async function listPortfolioProjects(builderId: string, serviceId?: string) {
  let query = supabase
    .from("portfolio_projects")
    .select("*")
    .eq("builder_id", builderId)
    .order("created_at", { ascending: false });

  if (serviceId) {
    query = query.eq("service_id", serviceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizePortfolioProject(row as Record<string, unknown>));
}

export async function listPortfolioProjectsByService(serviceId: string) {
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizePortfolioProject(row as Record<string, unknown>));
}

export async function getPortfolioProject(id: string) {
  const { data, error } = await supabase.from("portfolio_projects").select("*").eq("id", id).single();
  if (error) throw error;
  return normalizePortfolioProject(data as Record<string, unknown>);
}

export async function createPortfolioProject(builderId: string, input: PortfolioInput) {
  const { data, error } = await supabase
    .from("portfolio_projects")
    .insert({ ...input, builder_id: builderId })
    .select()
    .single();
  if (error) throw error;
  return normalizePortfolioProject(data as Record<string, unknown>);
}

export async function updatePortfolioProject(id: string, input: PortfolioInput) {
  const { data, error } = await supabase
    .from("portfolio_projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return normalizePortfolioProject(data as Record<string, unknown>);
}

export async function deletePortfolioProject(id: string) {
  const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
  if (error) throw error;
}
