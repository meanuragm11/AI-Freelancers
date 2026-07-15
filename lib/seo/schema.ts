import { generateCanonical } from './metadata';
import {
  DEFAULT_DESCRIPTION,
  SITE_COUNTRY,
  SITE_EMAIL,
  SITE_NAME,
  SITE_URL,
} from './constants';

type JsonLdObject = Record<string, unknown>;

export function generateOrganizationSchema(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    email: SITE_EMAIL,
    address: {
      '@type': 'PostalAddress',
      addressCountry: SITE_COUNTRY,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE_EMAIL,
      availableLanguage: ['English'],
    },
    sameAs: [],
  };
}

export function generateWebSiteSchema(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/buyer/discover?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateWebPageSchema({
  title,
  description,
  path = '/',
}: {
  title: string;
  description: string;
  path?: string;
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: generateCanonical(path),
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function generateBreadcrumbSchema(items: BreadcrumbItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: generateCanonical(item.path),
    })),
  };
}

export type FaqItem = {
  question: string;
  answer: string;
};

export function generateFaqSchema(items: FaqItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/** Future: blog and editorial content */
export function generateArticleSchema({
  title,
  description,
  path,
  datePublished,
  dateModified,
  authorName = SITE_NAME,
}: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: generateCanonical(path),
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      '@type': 'Organization',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.png`,
      },
    },
  };
}

/** Future: open project listings */
export function generateJobPostingSchema({
  title,
  description,
  path,
  datePosted,
  validThrough,
  employmentType = 'CONTRACTOR',
}: {
  title: string;
  description: string;
  path: string;
  datePosted: string;
  validThrough?: string;
  employmentType?: string;
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description,
    url: generateCanonical(path),
    datePosted,
    validThrough,
    employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: SITE_COUNTRY,
      },
    },
  };
}

/** Future: marketplace service listings */
export function generateProductSchema({
  name,
  description,
  path,
  price,
  currency = 'USD',
  imagePath,
}: {
  name: string;
  description: string;
  path: string;
  price: number;
  currency?: string;
  imagePath?: string;
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url: generateCanonical(path),
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    ...(imagePath
      ? {
          image: imagePath.startsWith('http') ? imagePath : `${SITE_URL}${imagePath}`,
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url: generateCanonical(path),
    },
  };
}

export function generateGlobalSchemas(): JsonLdObject[] {
  return [generateOrganizationSchema(), generateWebSiteSchema()];
}
