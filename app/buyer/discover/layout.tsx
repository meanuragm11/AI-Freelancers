import type { Metadata } from 'next';
import { discoverPageMetadata } from '@/lib/seo/pages';

export const metadata: Metadata = discoverPageMetadata;

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
