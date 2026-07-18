import {
  createPortfolioProject,
  deletePortfolioProject,
  formToPortfolioInput,
  listPortfolioProjects,
  listPortfolioProjectsByService,
  projectToFormState,
  updatePortfolioProject,
  type PortfolioFormState,
} from "@/lib/portfolio";
import {
  EMPTY_ONBOARDING_PROFILE,
  ONBOARDING_COUNTRIES,
  profileToDraftPayload,
  type OnboardingProfileState,
} from "@/lib/onboarding/profile";
import { listBuilderServices } from "@/lib/services";
import { serviceToFormState, type ServiceFormState } from "@/lib/services/form";
import { supabase } from "@/lib/supabaseClient";
import type { Service } from "@/types/marketplace";

export type OnboardingProgress = {
  globalStep: number;
  serviceStep: number;
};

export type OnboardingDraftState = {
  profile: OnboardingProfileState;
  draftService: Service | null;
  serviceForm: ServiceFormState | null;
  globalStep: number;
  serviceStep: number;
};

const progressKey = (userId: string) => `zelance_onboarding_progress_${userId}`;

export function readOnboardingProgress(userId: string): OnboardingProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(progressKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingProgress;
    if (
      typeof parsed.globalStep === "number" &&
      typeof parsed.serviceStep === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeOnboardingProgress(
  userId: string,
  globalStep: number,
  serviceStep: number
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    progressKey(userId),
    JSON.stringify({ globalStep, serviceStep })
  );
}

export function clearOnboardingProgress(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(progressKey(userId));
}

function projectHasDraftContent(project: PortfolioFormState): boolean {
  return (
    Boolean(project.title.trim()) ||
    Boolean(project.short_description.trim()) ||
    project.links.some((link) => link.title.trim() || link.url.trim()) ||
    project.media_files.length > 0 ||
    project.pendingFiles.length > 0
  );
}

export async function syncOnboardingPortfolioDraft(
  userId: string,
  projects: PortfolioFormState[]
): Promise<PortfolioFormState[]> {
  const existing = await listPortfolioProjects(userId);
  const onboardingProjects = existing.filter((project) => !project.service_id);
  const keepIds = new Set(
    projects.filter((project) => project.id).map((project) => project.id as string)
  );

  for (const row of onboardingProjects) {
    if (!keepIds.has(row.id)) {
      await deletePortfolioProject(row.id);
    }
  }

  const updatedProjects = [...projects];
  for (let index = 0; index < updatedProjects.length; index += 1) {
    const project = updatedProjects[index];
    if (!projectHasDraftContent(project)) continue;

    const input = formToPortfolioInput(project);
    const title = input.title?.trim() || "Untitled Project";

    if (project.id) {
      await updatePortfolioProject(project.id, { ...input, title });
      continue;
    }

    const created = await createPortfolioProject(userId, { ...input, title });
    updatedProjects[index] = { ...project, id: created.id };
  }

  return updatedProjects;
}

export async function saveOnboardingProfileDraft(
  userId: string,
  profile: OnboardingProfileState
): Promise<{ profile: OnboardingProfileState; error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .upsert(profileToDraftPayload(userId, profile), { onConflict: "id" });

  if (error) {
    return { profile, error: error.message };
  }

  try {
    const portfolioProjects = await syncOnboardingPortfolioDraft(
      userId,
      profile.portfolioProjects
    );
    return { profile: { ...profile, portfolioProjects } };
  } catch (err: unknown) {
    return {
      profile,
      error: err instanceof Error ? err.message : "Failed to save portfolio draft",
    };
  }
}

export async function loadOnboardingDraft(userId: string): Promise<OnboardingDraftState> {
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, headline, location, bio, tech_stack")
    .eq("id", userId)
    .single();

  const portfolioRows = (await listPortfolioProjects(userId)).filter(
    (project) => !project.service_id
  );

  const services = await listBuilderServices(userId);
  const draftService = services.find((service) => service.status === "draft") ?? null;

  let serviceForm: ServiceFormState | null = null;
  if (draftService) {
    const servicePortfolio = await listPortfolioProjectsByService(draftService.id);
    serviceForm = serviceToFormState(
      draftService,
      servicePortfolio.map((project) => project.id)
    );
  }

  const progress = readOnboardingProgress(userId);
  const globalStep =
    progress?.globalStep ?? (draftService ? 2 : 1);
  const serviceStep = progress?.serviceStep ?? 1;

  return {
    profile: {
      ...EMPTY_ONBOARDING_PROFILE,
      full_name: profileRow?.full_name || "",
      headline: profileRow?.headline || "",
      location: profileRow?.location || ONBOARDING_COUNTRIES[4],
      bio: profileRow?.bio || "",
      tech_stack: profileRow?.tech_stack || [],
      portfolioProjects: portfolioRows.map(projectToFormState),
    },
    draftService,
    serviceForm,
    globalStep: draftService ? Math.max(2, globalStep) : 1,
    serviceStep: draftService ? Math.max(1, serviceStep) : 1,
  };
}
