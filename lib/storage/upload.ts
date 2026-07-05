import { supabase } from "@/lib/supabaseClient";

const BUCKET = "marketplace-uploads";

export type MarketplaceUploadResult = {
  bucket: string;
  path: string;
  publicUrl: string;
};

export async function uploadMarketplaceFile(
  userId: string,
  folder: string,
  file: File
): Promise<string> {
  const result = await uploadMarketplaceFileWithMetadata(userId, folder, file);
  return result.publicUrl;
}

export async function uploadMarketplaceFileWithMetadata(
  userId: string,
  folder: string,
  file: File
): Promise<MarketplaceUploadResult> {
  const ext = file.name.split(".").pop() || "bin";
  const filePath = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    upsert: false,
    cacheControl: "3600",
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return {
    bucket: BUCKET,
    path: filePath,
    publicUrl: data.publicUrl,
  };
}
