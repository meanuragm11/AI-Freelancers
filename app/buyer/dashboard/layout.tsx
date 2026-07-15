import type { Metadata } from 'next';
import { generateNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateNoIndexMetadata(
  'Buyer Dashboard',
  'Manage your AI service purchases, open projects, and escrow-backed collaborations on Zelance.',
);

export default function BuyerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
