const SUPABASE_STORAGE_PATH_PREFIXES = [
  "/storage/v1/object/public/",
  "/storage/v1/object/sign/",
  "/storage/v1/render/image/public/",
] as const;

/** Public or signed Supabase storage object URL. */
export function isSupabaseStorageUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".supabase.co") &&
      SUPABASE_STORAGE_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))
    );
  } catch {
    return false;
  }
}

/**
 * Supabase CDN URLs should bypass /_next/image — the optimizer fetch times out on
 * large marketplace uploads (Next.js uses a fixed 7s upstream timeout).
 */
export function shouldBypassNextImageOptimization(url?: string | null): boolean {
  return isSupabaseStorageUrl(url);
}

/** URLs safe to pass to next/image (https/http or same-origin paths). */
export function isDisplayableImageUrl(url?: string | null): url is string {
  if (!url?.trim()) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/")
  );
}

export function pickDisplayableImageUrl(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  for (const candidate of candidates) {
    if (isDisplayableImageUrl(candidate)) return candidate;
  }
  return undefined;
}
