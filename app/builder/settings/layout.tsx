import type { Metadata } from 'next';
import { generateNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateNoIndexMetadata(
  'Account Settings',
  'Manage your Zelance builder account settings, profile, and preferences.',
);

export default function BuilderSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
