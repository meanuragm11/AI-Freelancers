import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/metadata';
import { LEGAL_PAGE_PATHS } from '@/lib/seo/constants';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/about-us`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/buyer/discover`, lastModified, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/projects`, lastModified, changeFrequency: 'hourly', priority: 0.9 },
    ...LEGAL_PAGE_PATHS.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
  ];

  // TODO: Dynamic profile pages — /profile/[id]
  // TODO: Dynamic service pages — /service/[id]
  // TODO: Blog posts — /blog/[slug]

  return staticPages;
}
