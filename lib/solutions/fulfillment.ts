import type { SupabaseClient } from "@supabase/supabase-js";

export type SolutionFulfillmentFields = {
  id: string;
  title?: string | null;
  delivery_model?: string | null;
  fulfillment_payload_text?: string | null;
  fulfillment_payload_url?: string | null;
  download_bucket?: string | null;
  download_file_path?: string | null;
  download_file_name?: string | null;
  download_file_size?: number | null;
  download_content_type?: string | null;
  download_metadata?: unknown;
  status?: string | null;
};

export type SolutionDownloadMetadata = {
  additional_files?: Array<{
    bucket: string;
    path: string;
    name: string;
    size?: number;
    content_type?: string;
  }>;
};

export function parseSolutionDownloadMetadata(raw: unknown): SolutionDownloadMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as SolutionDownloadMetadata;
}

export function solutionHasFulfillment(service: {
  fulfillment_payload_text?: string | null;
  fulfillment_payload_url?: string | null;
  download_file_path?: string | null;
}): boolean {
  return Boolean(
    service.fulfillment_payload_text?.trim() ||
      service.fulfillment_payload_url?.trim() ||
      service.download_file_path
  );
}

export async function assertUserOwnsSolution(
  supabaseAdmin: SupabaseClient,
  userId: string,
  serviceId: string
): Promise<{ libraryId: string; service: SolutionFulfillmentFields } | null> {
  const { data: libraryEntry, error: libraryError } = await supabaseAdmin
    .from("library")
    .select(`
      id,
      service_id,
      services (
        id,
        title,
        delivery_model,
        fulfillment_payload_text,
        fulfillment_payload_url,
        download_bucket,
        download_file_path,
        download_file_name,
        download_file_size,
        download_content_type,
        download_metadata,
        status
      )
    `)
    .eq("user_id", userId)
    .eq("service_id", serviceId)
    .maybeSingle();

  if (libraryError) throw libraryError;

  const service = libraryEntry?.services as SolutionFulfillmentFields | null | undefined;
  if (!libraryEntry || !service) return null;

  return { libraryId: libraryEntry.id, service };
}
