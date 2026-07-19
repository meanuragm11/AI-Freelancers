const PRODUCTION_APP_URL = 'https://www.zelance.co';
const DEVELOPMENT_APP_URL = 'http://localhost:3000';

/** Canonical app origin — production uses www.zelance.co; dev uses localhost. */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return process.env.NODE_ENV === 'production' ? PRODUCTION_APP_URL : DEVELOPMENT_APP_URL;
}

/** Alias for SEO and email — same canonical origin as getAppUrl. */
export function getSiteUrl(): string {
  return getAppUrl();
}

/** Resolve a relative or absolute path to a full app URL. */
export function resolveAppUrl(path?: string): string {
  if (!path) return getAppUrl();
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getAppUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Stable paths used in transactional email CTAs. */
export const EMAIL_PATHS = {
  workspace: '/workspace',
  escrowLedger: '/workspace/escrow-ledger',
  privacy: '/privacy-policy',
  terms: '/terms-of-service',
} as const;

export function getEmailLogoUrl(): string {
  return `${getAppUrl()}/logo.svg`;
}
