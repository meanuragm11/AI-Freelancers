import type { Metadata } from 'next';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  SITE_EMAIL,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  TITLE_TEMPLATE,
  TWITTER_HANDLE,
} from './constants';

export function getSiteUrl(): string {
  return SITE_URL;
}

export function generateCanonical(path: string = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function generateOpenGraph({
  title,
  description,
  path = '/',
  imagePath = OG_IMAGE_PATH,
  type = 'website',
}: {
  title: string;
  description: string;
  path?: string;
  imagePath?: string;
  type?: 'website' | 'article';
}): NonNullable<Metadata['openGraph']> {
  const url = generateCanonical(path);
  const imageUrl = imagePath.startsWith('http') ? imagePath : `${getSiteUrl()}${imagePath}`;

  return {
    type,
    locale: SITE_LOCALE,
    url,
    siteName: SITE_NAME,
    title,
    description,
    images: [
      {
        url: imageUrl,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: `${SITE_NAME} — ${title}`,
      },
    ],
  };
}

export function generateTwitter({
  title,
  description,
  imagePath = OG_IMAGE_PATH,
}: {
  title: string;
  description: string;
  imagePath?: string;
}): NonNullable<Metadata['twitter']> {
  const imageUrl = imagePath.startsWith('http') ? imagePath : `${getSiteUrl()}${imagePath}`;

  return {
    card: 'summary_large_image',
    title,
    description,
    creator: TWITTER_HANDLE,
    images: [imageUrl],
  };
}

export type GenerateSEOMetadataOptions = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  imagePath?: string;
  openGraphType?: 'website' | 'article';
  absoluteTitle?: boolean;
};

export function generateSEOMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  keywords = DEFAULT_KEYWORDS,
  noIndex = false,
  imagePath = OG_IMAGE_PATH,
  openGraphType = 'website',
  absoluteTitle = false,
}: GenerateSEOMetadataOptions): Metadata {
  const resolvedTitle = title === DEFAULT_TITLE ? DEFAULT_TITLE : title;
  const canonical = generateCanonical(path);

  return {
    title: absoluteTitle ? { absolute: resolvedTitle } : resolvedTitle,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: generateOpenGraph({
      title: resolvedTitle,
      description,
      path,
      imagePath,
      type: openGraphType,
    }),
    twitter: generateTwitter({
      title: resolvedTitle,
      description,
      imagePath,
    }),
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function generateNoIndexMetadata(
  title: string,
  description: string = DEFAULT_DESCRIPTION,
): Metadata {
  return generateSEOMetadata({
    title,
    description,
    noIndex: true,
  });
}

export function generateRootMetadata(): Metadata {
  const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: DEFAULT_TITLE,
      template: TITLE_TEMPLATE,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    authors: [{ name: SITE_NAME, url: getSiteUrl() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    applicationName: SITE_NAME,
    category: 'technology',
    alternates: {
      canonical: generateCanonical('/'),
    },
    openGraph: generateOpenGraph({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      path: '/',
    }),
    twitter: generateTwitter({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    }),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: {
      icon: [{ url: '/icon.png', type: 'image/png' }],
      apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
    },
    manifest: '/manifest.webmanifest',
    ...(googleSiteVerification
      ? {
          verification: {
            google: googleSiteVerification,
          },
        }
      : {}),
  };
}
