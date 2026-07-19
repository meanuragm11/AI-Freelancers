import { TWITTER_HANDLE } from '@/lib/seo/constants';

export interface FooterLinkItem {
  label: string;
  href: string;
  external?: boolean;
}

export const SUPPORT_EMAIL = 'support@zelance.co';

export const platformLinks: FooterLinkItem[] = [
  { label: 'Discover AI Solutions', href: '/buyer/discover' },
  { label: 'Open Projects', href: '/projects' },
  { label: 'Become an AI Expert', href: '/builder/dashboard' },
  { label: 'Publish AI Solution', href: '/builder/dashboard?view=services' },
];

export const companyLinks: FooterLinkItem[] = [
  { label: 'About Us', href: '/about-us' },
  { label: 'Contact Us', href: '/support' },
];

export const resourceLinks: FooterLinkItem[] = [
  { label: 'Help Center', href: '/support' },
  { label: 'FAQ', href: '/faq' },
  { label: 'My Tickets', href: '/support/tickets' },
];

export const legalLinks: FooterLinkItem[] = [
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Refund & Escrow Policy', href: '/refund-escrow-policy' },
  { label: 'Community Guidelines', href: '/community-guidelines' },
  { label: 'AI & Intellectual Property Policy', href: '/ai-intellectual-property-policy' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Trust & Safety', href: '/trust-safety' },
];

export const bottomBarLinks: FooterLinkItem[] = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms', href: '/terms-of-service' },
  { label: 'Cookies', href: '/cookie-policy' },
];

const twitterUsername = TWITTER_HANDLE.replace(/^@/, '');

export const socialLinks = [
  {
    label: 'Follow Zelance on X',
    href: `https://x.com/${twitterUsername}`,
    icon: 'x' as const,
  },
  {
    label: 'Connect with Zelance on LinkedIn',
    href: 'https://www.linkedin.com/company/zelance/',
    icon: 'linkedin' as const,
  },
];

export const companyDescription =
  'Zelance is the AI-first marketplace where businesses hire vetted AI experts, buy production-ready services, and launch custom projects with escrow-backed confidence.';
