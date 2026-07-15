import type { Metadata } from 'next';
import { projectsPageMetadata } from '@/lib/seo/pages';

export const metadata: Metadata = projectsPageMetadata;

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
