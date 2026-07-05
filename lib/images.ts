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
