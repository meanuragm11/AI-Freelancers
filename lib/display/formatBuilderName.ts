import { formatDisplayName } from "@/lib/display/formatDisplayName";

const FALLBACK_NAME = "Verified Builder";

/**
 * Masks builder surnames for public display: "Anurag Makode" → "Anurag M."
 * Handles single names, empty values, and already-masked names.
 */
export function formatBuilderName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return FALLBACK_NAME;
  return formatDisplayName(trimmed);
}
