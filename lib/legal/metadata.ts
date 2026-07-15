import type { Metadata } from 'next';
import { generateSEOMetadata } from '@/lib/seo/metadata';

export function createLegalMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return generateSEOMetadata({
    title,
    description,
    path,
  });
}
