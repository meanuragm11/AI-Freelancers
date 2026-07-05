import { uploadMarketplaceFile } from "@/lib/storage/upload";
import {
  createPortfolioProject,
  deletePortfolioProject,
  listPortfolioProjectsByService,
  updatePortfolioProject,
} from "@/lib/portfolio";
import {
  createService,
  setServiceStatus,
  updateService,
} from "@/lib/services";
import type { Service, ServiceStatus } from "@/types/marketplace";
import {
  formStateToServiceInput,
  type ServiceFormPortfolioProject,
  type ServiceFormState,
} from "@/lib/services/form";

async function uploadPortfolioProjectMedia(
  builderId: string,
  project: ServiceFormPortfolioProject
) {
  const mediaFiles = [...project.media_files];
  for (const file of project.pendingFiles) {
    const url = await uploadMarketplaceFile(builderId, "portfolio", file);
    mediaFiles.push({ type: file.type, url, name: file.name });
  }
  return mediaFiles;
}

async function syncServicePortfolioProjects(
  builderId: string,
  serviceId: string,
  projects: ServiceFormPortfolioProject[]
) {
  const existing = await listPortfolioProjectsByService(serviceId);
  const keepIds = new Set(projects.filter((p) => p.id).map((p) => p.id as string));

  for (const existingProject of existing) {
    if (!keepIds.has(existingProject.id)) {
      await deletePortfolioProject(existingProject.id);
    }
  }

  for (const project of projects) {
    if (!project.title.trim()) continue;

    const media_files = await uploadPortfolioProjectMedia(builderId, project);
    const projectUrl = project.project_url.trim();
    const links = projectUrl ? [{ title: "Project", url: projectUrl }] : [];
    const payload = {
      title: project.title.trim(),
      short_description: project.short_description.trim() || null,
      detailed_description: project.detailed_description.trim() || null,
      project_url: projectUrl || null,
      links,
      media_files,
      service_id: serviceId,
    };

    if (project.id) {
      await updatePortfolioProject(project.id, payload);
    } else {
      await createPortfolioProject(builderId, payload);
    }
  }
}

export async function saveServiceFromForm(
  builderId: string,
  form: ServiceFormState,
  options: {
    serviceId?: string;
    publish?: boolean;
  }
): Promise<Service> {
  const status: ServiceStatus | undefined = options.publish
    ? "published"
    : options.serviceId
      ? undefined
      : "draft";

  const input = formStateToServiceInput(form, status);
  let saved: Service;

  if (options.serviceId) {
    saved = await updateService(options.serviceId, input);
    if (options.publish) {
      saved = await setServiceStatus(options.serviceId, "published");
    }
  } else {
    saved = await createService(builderId, input);
    if (options.publish) {
      saved = await setServiceStatus(saved.id, "published");
    }
  }

  await syncServicePortfolioProjects(builderId, saved.id, form.portfolioProjects);
  return saved;
}

export function portfolioToFormProjects(
  projects: Array<{
    id: string;
    title: string;
    short_description?: string | null;
    detailed_description?: string | null;
    project_url?: string | null;
    media_files?: { type: string; url: string; name: string }[] | null;
  }>
): ServiceFormPortfolioProject[] {
  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    short_description: project.short_description || "",
    detailed_description: project.detailed_description || "",
    project_url: project.project_url || "",
    media_files: project.media_files || [],
    pendingFiles: [],
  }));
}
