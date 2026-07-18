const STORAGE_KEY = 'zelance_post_auth_redirect';

/** Persist return path before sending user to /auth */
export function saveAuthRedirect(path: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, path);
}

/** Read stored return path without clearing it */
export function peekAuthRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

/** Read and clear stored return path */
export function consumeAuthRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  const path = sessionStorage.getItem(STORAGE_KEY);
  if (path) sessionStorage.removeItem(STORAGE_KEY);
  return path;
}

/** Build /auth URL with encoded redirect query param */
export function buildAuthUrl(returnPath: string): string {
  return `/auth?redirect=${encodeURIComponent(returnPath)}`;
}

/** Resolve post-auth destination: explicit redirect param, stored path, or default */
export function resolvePostAuthDestination(
  redirectParam: string | null,
  defaultPath: string
): string {
  const stored = consumeAuthRedirect();
  const candidate = redirectParam || stored;
  if (!candidate) return defaultPath;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return defaultPath;
  return candidate;
}
