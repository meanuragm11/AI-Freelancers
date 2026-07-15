import type { Metadata } from 'next';
import { becomeExpertPageMetadata } from '@/lib/seo/pages';

export const metadata = becomeExpertPageMetadata;

export default function BuilderDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
