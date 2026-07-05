import { supabase } from "@/lib/supabaseClient";
import { uploadMarketplaceFileWithMetadata } from "@/lib/storage/upload";
import {
  resolveComponentCategory,
  type ComponentFormState,
} from "@/lib/components/form";

type ExistingAsset = {
  bucket?: string | null;
  path?: string | null;
  name?: string | null;
  size?: number | null;
  content_type?: string | null;
};

type SaveComponentOptions = {
  componentId?: string;
  isFree: boolean;
  thumbnailFile?: File | null;
  existingThumbnailUrl?: string | null;
  assetFile?: File | null;
  existingAsset?: ExistingAsset | null;
};

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const embedRes = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!embedRes.ok) {
      const embedData = await embedRes.json().catch(() => null);
      console.warn(
        "Failed to generate embedding, saving without vector:",
        embedData?.error || embedRes.statusText
      );
      return null;
    }

    const embedData = await embedRes.json();
    if (Array.isArray(embedData.embedding) && embedData.embedding.length > 0) {
      return embedData.embedding;
    }
  } catch (embedError) {
    console.warn("Failed to generate embedding, saving without vector:", embedError);
  }

  return null;
}

export async function saveComponentFromForm(
  builderId: string,
  form: ComponentFormState,
  options: SaveComponentOptions
): Promise<void> {
  const finalCategory = resolveComponentCategory(form);
  const finalPriceUsd = options.isFree ? 0 : form.price_usd;
  const finalPriceInr = Math.round(finalPriceUsd * 83.5);

  let thumbnailUrl = options.existingThumbnailUrl ?? null;
  if (options.thumbnailFile) {
    const thumbnailUpload = await uploadMarketplaceFileWithMetadata(
      builderId,
      "component-thumbnails",
      options.thumbnailFile
    );
    thumbnailUrl = thumbnailUpload.publicUrl;
  }

  if (!thumbnailUrl) {
    throw new Error("Thumbnail image is required");
  }

  let assetUpload: Awaited<ReturnType<typeof uploadMarketplaceFileWithMetadata>> | null = null;
  if (options.assetFile) {
    assetUpload = await uploadMarketplaceFileWithMetadata(
      builderId,
      "component-assets",
      options.assetFile
    );
  }

  const textToEmbed = `${form.title.trim()}. ${finalCategory}. ${form.description.trim()}`;
  const embeddingArray = await generateEmbedding(textToEmbed);

  const componentPayload: Record<string, unknown> = {
    title: form.title.trim(),
    description: form.description.trim(),
    category: finalCategory,
    price_usd: finalPriceUsd,
    price_inr: finalPriceInr,
    thumbnail_url: thumbnailUrl,
    delivery_method: form.delivery_method,
    secure_payload_text:
      form.delivery_method === "secure_text" ? form.secure_payload_text.trim() : null,
    asset_bucket:
      form.delivery_method === "file_upload"
        ? assetUpload?.bucket ?? options.existingAsset?.bucket ?? null
        : null,
    asset_file_path:
      form.delivery_method === "file_upload"
        ? assetUpload?.path ?? options.existingAsset?.path ?? null
        : null,
    asset_file_name:
      form.delivery_method === "file_upload"
        ? options.assetFile?.name ?? options.existingAsset?.name ?? null
        : null,
    asset_file_size:
      form.delivery_method === "file_upload"
        ? options.assetFile?.size ?? options.existingAsset?.size ?? null
        : null,
    asset_content_type:
      form.delivery_method === "file_upload"
        ? options.assetFile?.type ?? options.existingAsset?.content_type ?? null
        : null,
    file_url: null,
    license_type: form.license_type,
  };

  if (embeddingArray) {
    componentPayload.embedding = embeddingArray;
  }

  if (options.componentId) {
    const runUpdate = () =>
      supabase
        .from("components")
        .update(componentPayload)
        .eq("id", options.componentId!)
        .eq("builder_id", builderId)
        .select("id")
        .single();

    let { data: updatedRow, error: updateError } = await runUpdate();

    if (
      updateError &&
      "code" in updateError &&
      updateError.code === "PGRST204" &&
      componentPayload.embedding
    ) {
      delete componentPayload.embedding;
      ({ data: updatedRow, error: updateError } = await runUpdate());
    }

    if (updateError) throw updateError;
    if (!updatedRow?.id) {
      throw new Error(
        "Component update failed. You may not have permission to edit this listing."
      );
    }
    return;
  }

  const insertPayload: Record<string, unknown> = {
    ...componentPayload,
    builder_id: builderId,
    status: "published",
    published_at: new Date().toISOString(),
  };

  let { error: insertError } = await supabase.from("components").insert([insertPayload]);

  if (
    insertError &&
    "code" in insertError &&
    insertError.code === "PGRST204" &&
    insertPayload.embedding
  ) {
    delete insertPayload.embedding;
    const retry = await supabase.from("components").insert([insertPayload]);
    insertError = retry.error;
  }

  if (insertError) throw insertError;
}
