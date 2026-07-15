import type { Metadata } from 'next';
import { generateNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateNoIndexMetadata(
  'Sign In',
  'Sign in or create your Zelance account to hire AI experts, publish services, and manage marketplace projects.',
);

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
