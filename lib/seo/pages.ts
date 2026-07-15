import { generateSEOMetadata } from './metadata';

export const pageSeo = {
  home: {
    title: 'Zelance',
    description:
      'Hire elite AI engineers, browse open projects, and buy production-ready AI services and assets on Zelance — the premium AI talent network with escrow-backed payments.',
    path: '/',
  },
  about: {
    title: 'About Us',
    description:
      'Learn about Zelance — the AI-first marketplace connecting businesses with verified AI experts, engineers, and builders through secure, transparent, outcome-focused collaboration.',
    path: '/about-us',
  },
  discover: {
    title: 'Hire AI Experts',
    description:
      'Browse and hire vetted AI experts, prompt engineers, and agent builders. Filter by skills, ratings, and delivery time on the Zelance marketplace.',
    path: '/buyer/discover',
  },
  projects: {
    title: 'Open Projects',
    description:
      'Browse open AI projects on Zelance. Post your project or submit proposals from verified experts — hire through escrow when you are ready.',
    path: '/projects',
  },
  becomeExpert: {
    title: 'Become AI Expert',
    description:
      'Join Zelance as an AI expert. Publish services, sell reusable AI assets, compete for open projects, and earn through secure escrow-backed payouts.',
    path: '/builder/dashboard',
  },
  terms: {
    title: 'Terms of Service',
    description:
      'Read the Zelance Terms of Service governing marketplace use, escrow payments, and platform policies for buyers and builders.',
    path: '/terms-of-service',
  },
  privacy: {
    title: 'Privacy Policy',
    description:
      'Learn how Zelance collects, uses, and protects your personal data across the AI marketplace platform.',
    path: '/privacy-policy',
  },
  trustSafety: {
    title: 'Trust & Safety',
    description:
      'Zelance Trust & Safety policies covering fraud prevention, dispute resolution, and platform integrity for buyers and builders.',
    path: '/trust-safety',
  },
  community: {
    title: 'Community Guidelines',
    description:
      'Community standards and conduct expectations for buyers, builders, and all participants on the Zelance marketplace.',
    path: '/community-guidelines',
  },
  cookie: {
    title: 'Cookie Policy',
    description:
      'How Zelance uses cookies and similar technologies to operate the marketplace and improve your experience.',
    path: '/cookie-policy',
  },
  refund: {
    title: 'Refund & Escrow Policy',
    description:
      'Zelance refund, escrow release, and dispute policies for marketplace transactions between buyers and AI experts.',
    path: '/refund-escrow-policy',
  },
  aiIp: {
    title: 'AI & Intellectual Property Policy',
    description:
      'Zelance policies on AI-generated content, intellectual property rights, and infringement reporting on the marketplace.',
    path: '/ai-intellectual-property-policy',
  },
} as const;

export const homePageMetadata = generateSEOMetadata({ ...pageSeo.home, absoluteTitle: true });
export const aboutPageMetadata = generateSEOMetadata(pageSeo.about);
export const discoverPageMetadata = generateSEOMetadata(pageSeo.discover);
export const projectsPageMetadata = generateSEOMetadata(pageSeo.projects);
export const becomeExpertPageMetadata = generateSEOMetadata({
  ...pageSeo.becomeExpert,
  noIndex: true,
});

export const legalPageMetadata = {
  terms: generateSEOMetadata(pageSeo.terms),
  privacy: generateSEOMetadata(pageSeo.privacy),
  trustSafety: generateSEOMetadata(pageSeo.trustSafety),
  community: generateSEOMetadata(pageSeo.community),
  cookie: generateSEOMetadata(pageSeo.cookie),
  refund: generateSEOMetadata(pageSeo.refund),
  aiIp: generateSEOMetadata(pageSeo.aiIp),
};
