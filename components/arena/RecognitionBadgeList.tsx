'use client';

import React from 'react';
import type { RecognitionBadgeGrant } from '@/lib/arena/badges/types';
import { sortBadgesByPriority } from '@/lib/arena/badges/types';
import RecognitionBadge from './RecognitionBadge';

type RecognitionBadgeListProps = {
  badges: RecognitionBadgeGrant[];
  size?: 'sm' | 'md';
  className?: string;
  max?: number;
};

export default function RecognitionBadgeList({
  badges,
  size = 'sm',
  className = '',
  max,
}: RecognitionBadgeListProps) {
  const sorted = sortBadgesByPriority(badges);
  const visible = max != null ? sorted.slice(0, max) : sorted;

  if (visible.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visible.map((badge) => (
        <RecognitionBadge key={badge.key} badge={badge} size={size} />
      ))}
    </div>
  );
}

export { RecognitionBadgeList };
