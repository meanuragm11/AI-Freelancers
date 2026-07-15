export const SITE_NAME = 'Zelance';

export const SITE_URL =
  (process.env.NEXT_PUBLIC_APP_URL || 'https://zelance.co').replace(/\/$/, '');

export const SITE_EMAIL = 'support@zelance.co';

export const SITE_COUNTRY = 'India';

export const SITE_LOCALE = 'en_US';

export const SITE_LANG = 'en-US';

export const TWITTER_HANDLE = '@zelancehq';

export const THEME_COLOR = '#111827';

export const OG_IMAGE_PATH = '/opengraph-image.png';

export const OG_IMAGE_WIDTH = 1200;

export const OG_IMAGE_HEIGHT = 630;

export const DEFAULT_TITLE = 'Zelance';

export const TITLE_TEMPLATE = '%s | Zelance';

export const DEFAULT_DESCRIPTION =
  'Zelance is the AI-first marketplace where businesses hire vetted AI experts, buy production-ready AI services and assets, and launch custom projects with escrow-backed confidence.';

export const DEFAULT_KEYWORDS = [
  'Zelance',
  'AI marketplace',
  'hire AI experts',
  'AI engineers',
  'prompt engineering',
  'AI agents',
  'AI automation',
  'AI services',
  'AI assets',
  'open projects',
  'escrow',
  'freelance AI',
  'become AI expert',
];

export const LEGAL_PAGE_PATHS = [
  '/terms-of-service',
  '/privacy-policy',
  '/trust-safety',
  '/community-guidelines',
  '/cookie-policy',
  '/refund-escrow-policy',
  '/ai-intellectual-property-policy',
] as const;
