export const UNKNOWN_USER = "Unknown User";

export type DisplayNameSource = {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  username?: string | null;
};

function isAlreadyMasked(lastPart: string): boolean {
  return /^[A-Za-z]\.?$/.test(lastPart);
}

/**
 * Resolves a human-readable name from profile/auth fields.
 * Priority: full name → first+last → display name → username → email local-part → Unknown User.
 */
export function resolveDisplayName(
  source?: DisplayNameSource | null,
  email?: string | null,
): string {
  const fullName = source?.full_name?.trim();
  if (fullName) return fullName;

  const firstLast = [source?.first_name?.trim(), source?.last_name?.trim()]
    .filter(Boolean)
    .join(" ");
  if (firstLast) return firstLast;

  const displayName = source?.display_name?.trim();
  if (displayName) return displayName;

  const username = source?.username?.trim();
  if (username) return username;

  const emailLocal = email?.split("@")[0]?.trim();
  if (emailLocal) return emailLocal;

  return UNKNOWN_USER;
}

/**
 * Privacy-safe display: "John Smith" → "John S.", "Madonna" → "Madonna".
 */
export function formatDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return UNKNOWN_USER;

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];

  const last = parts[parts.length - 1];
  if (isAlreadyMasked(last)) return trimmed;

  const first = parts.slice(0, -1).join(" ");
  const initial = last.charAt(0).toUpperCase();
  return `${first} ${initial}.`;
}

/** Avatar initials: "John Smith" → "JS", "Madonna" → "M". */
export function getDisplayNameInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function formatProfileDisplayName(
  source?: DisplayNameSource | null,
  email?: string | null,
): string {
  return formatDisplayName(resolveDisplayName(source, email));
}
