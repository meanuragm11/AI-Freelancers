import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getAuthenticatedUser } from "@/lib/server/supabase";
import {
  assertUserOwnsSolution,
  parseSolutionDownloadMetadata,
} from "@/lib/solutions/fulfillment";

type RouteParams = { params: Promise<{ id: string }> };

const SIGNED_URL_EXPIRES_SECONDS = 60;

type DownloadBody = {
  fileKey?: string;
};

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as DownloadBody;
    const fileKey = body.fileKey || "primary";

    const supabaseAdmin = createSupabaseAdminClient();
    const owned = await assertUserOwnsSolution(supabaseAdmin, user.id, id);

    if (!owned) {
      return NextResponse.json({ error: "You have not purchased this AI Solution" }, { status: 403 });
    }

    const service = owned.service;
    if (service.status && service.status !== "published" && service.status !== "archived") {
      return NextResponse.json({ error: "AI Solution is no longer available" }, { status: 409 });
    }

    const metadata = parseSolutionDownloadMetadata(service.download_metadata);

    if (fileKey === "secure_text" || (fileKey === "primary" && service.fulfillment_payload_text)) {
      if (!service.fulfillment_payload_text) {
        return NextResponse.json({ error: "Secure text payload is missing" }, { status: 404 });
      }
      return NextResponse.json({
        deliveryMethod: "secure_text",
        title: service.title,
        payload: service.fulfillment_payload_text,
        fileKey: "secure_text",
      });
    }

    if (fileKey === "secure_url") {
      if (!service.fulfillment_payload_url) {
        return NextResponse.json({ error: "Secure URL is missing" }, { status: 404 });
      }
      return NextResponse.json({
        deliveryMethod: "secure_url",
        title: service.title,
        url: service.fulfillment_payload_url,
        fileKey: "secure_url",
      });
    }

    if (fileKey.startsWith("additional:")) {
      const index = Number(fileKey.split(":")[1]);
      const extra = metadata.additional_files?.[index];
      if (!extra?.bucket || !extra?.path) {
        return NextResponse.json({ error: "Requested file was not found" }, { status: 404 });
      }

      const { data, error: signedUrlError } = await supabaseAdmin.storage
        .from(extra.bucket)
        .createSignedUrl(extra.path, SIGNED_URL_EXPIRES_SECONDS, {
          download: extra.name || true,
        });

      if (signedUrlError) throw signedUrlError;

      return NextResponse.json({
        deliveryMethod: "file",
        title: service.title,
        url: data.signedUrl,
        fileName: extra.name,
        expiresIn: SIGNED_URL_EXPIRES_SECONDS,
        fileKey,
      });
    }

    if (service.download_bucket && service.download_file_path) {
      const { data, error: signedUrlError } = await supabaseAdmin.storage
        .from(service.download_bucket)
        .createSignedUrl(service.download_file_path, SIGNED_URL_EXPIRES_SECONDS, {
          download: service.download_file_name || true,
        });

      if (signedUrlError) throw signedUrlError;

      return NextResponse.json({
        deliveryMethod: "file",
        title: service.title,
        url: data.signedUrl,
        fileName: service.download_file_name,
        expiresIn: SIGNED_URL_EXPIRES_SECONDS,
        fileKey: "primary",
      });
    }

    if (service.fulfillment_payload_url) {
      return NextResponse.json({
        deliveryMethod: "secure_url",
        title: service.title,
        url: service.fulfillment_payload_url,
        fileKey: "secure_url",
      });
    }

    if (service.fulfillment_payload_text) {
      return NextResponse.json({
        deliveryMethod: "secure_text",
        title: service.title,
        payload: service.fulfillment_payload_text,
        fileKey: "secure_text",
      });
    }

    return NextResponse.json({ error: "Download is not configured for this solution" }, { status: 404 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Download authorization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
