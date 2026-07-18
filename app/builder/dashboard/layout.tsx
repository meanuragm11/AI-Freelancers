import type { Metadata } from 'next';
import { workspacePageMetadata } from '@/lib/seo/pages';

export const metadata = workspacePageMetadata;

export default function BuilderDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
