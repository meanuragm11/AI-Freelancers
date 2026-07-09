import type { Metadata } from 'next';

function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://zelance.com';
  return url.replace(/\/$/, '');
}

export function createLegalMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonical = `${getSiteUrl()}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${title} | Zelance`,
      description,
      url: canonical,
      type: 'website',
      siteName: 'Zelance',
    },
    twitter: {
      card: 'summary',
      title: `${title} | Zelance`,
      description,
    },
  };
}
