'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMyRecognition } from '@/lib/arena/badges/client';
import type { RecognitionBadgeGrant, NextBadgeHint } from '@/lib/arena/badges/types';
import RecognitionBadgeList from '@/components/arena/RecognitionBadgeList';

export default function BuilderRecognitionPanel() {
  const [badges, setBadges] = useState<RecognitionBadgeGrant[]>([]);
  const [nextBadge, setNextBadge] = useState<NextBadgeHint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRecognition()
      .then((data) => {
        setBadges(data.badges);
        setNextBadge(data.nextBadge);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm animate-pulse h-32" />
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Recognition</h2>
          <p className="text-sm text-slate-500 mt-1">Badges earned through delivery, momentum, and engagement.</p>
        </div>
        <Link
          href="/builder/recognition"
          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 shrink-0"
        >
          View All →
        </Link>
      </div>

      {badges.length > 0 ? (
        <RecognitionBadgeList badges={badges} size="md" className="mb-4" />
      ) : (
        <p className="text-sm text-slate-500 mb-4">No badges yet — keep building your reputation.</p>
      )}

      {nextBadge && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Next to earn</p>
          <p className="text-sm font-black text-slate-900">{nextBadge.emoji} {nextBadge.label}</p>
          <p className="text-xs text-slate-600 mt-1">{nextBadge.hint}</p>
        </div>
      )}
    </div>
  );
}
