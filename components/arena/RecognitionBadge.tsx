'use client';

import React from 'react';
import type { RecognitionBadgeGrant } from '@/lib/arena/badges/types';

type RecognitionBadgeProps = {
  badge: RecognitionBadgeGrant;
  size?: 'sm' | 'md';
  className?: string;
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[9px] gap-1',
  md: 'px-2.5 py-1 text-[10px] gap-1.5',
};

const BADGE_STYLES: Record<string, string> = {
  editors_pick: 'bg-violet-50 text-violet-700 ring-violet-200',
  trusted: 'bg-amber-50 text-amber-800 ring-amber-200',
  in_demand: 'bg-orange-50 text-orange-700 ring-orange-200',
  rising: 'bg-sky-50 text-sky-700 ring-sky-200',
  fast_responder: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export default function RecognitionBadge({
  badge,
  size = 'sm',
  className = '',
}: RecognitionBadgeProps) {
  const style = BADGE_STYLES[badge.key] ?? 'bg-slate-50 text-slate-700 ring-slate-200';

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-black uppercase tracking-wider ring-1 ${SIZE_CLASSES[size]} ${style} ${className}`}
      title={badge.description}
    >
      <span aria-hidden="true">{badge.emoji}</span>
      <span>{badge.label}</span>
    </span>
  );
}
