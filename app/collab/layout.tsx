import type { Metadata } from 'next';
import { generateNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateNoIndexMetadata(
  'Collaboration Workspace',
  'Manage your active Zelance collaboration, milestones, and deliverables.',
);

export default function CollabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
