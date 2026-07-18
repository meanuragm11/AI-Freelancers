import { syncPortfolioProjectsForService } from "@/lib/portfolio";
import {
  createService,
  setServiceStatus,
  updateService,
} from "@/lib/services";
import type { Service, ServiceStatus } from "@/types/marketplace";
import {
  formStateToServiceInput,
  type ServiceFormState,
} from "@/lib/services/form";
import { uploadMarketplaceFileWithMetadata } from "@/lib/storage/upload";

async function resolveDownloadFields(
  builderId: string,
  form: ServiceFormState
): Promise<{
  download_bucket: string | null;
  download_file_path: string | null;
  download_file_name: string | null;
  download_file_size: number | null;
  download_content_type: string | null;
}> {
  if (form.pendingDownloadFile) {
    const upload = await uploadMarketplaceFileWithMetadata(
      builderId,
      "solution-downloads",
      form.pendingDownloadFile
    );
    return {
      download_bucket: upload.bucket,
      download_file_path: upload.path,
      download_file_name: form.pendingDownloadFile.name,
      download_file_size: form.pendingDownloadFile.size,
      download_content_type: form.pendingDownloadFile.type || null,
    };
  }

  if (form.existingDownload?.path) {
    return {
      download_bucket: form.existingDownload.bucket,
      download_file_path: form.existingDownload.path,
      download_file_name: form.existingDownload.name,
      download_file_size: form.existingDownload.size,
      download_content_type: form.existingDownload.content_type,
    };
  }

  return {
    download_bucket: null,
    download_file_path: null,
    download_file_name: null,
    download_file_size: null,
    download_content_type: null,
  };
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

  const downloadFields = await resolveDownloadFields(builderId, form);
  const input = {
    ...formStateToServiceInput(form, status),
    ...downloadFields,
  };

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

  await syncPortfolioProjectsForService(builderId, saved.id, form.portfolioProjectIds);
  return saved;
}
