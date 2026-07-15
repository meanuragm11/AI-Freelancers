import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/metadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/builder/dashboard',
        '/buyer/dashboard',
        '/auth',
        '/account',
        '/settings',
        '/profile/edit',
        '/collab/',
        '/founder/',
        '/buyer/settings/',
        '/builder/settings/',
        '/checkout/',
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
