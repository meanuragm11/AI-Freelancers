import type { Metadata } from 'next';
import { generateNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateNoIndexMetadata(
  'Account Settings',
  'Manage your Zelance buyer account settings, profile, and preferences.',
);

export default function BuyerSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
