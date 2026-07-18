"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyRecognition } from "@/lib/arena/badges/client";
import type { RecognitionBadgeGrant, NextBadgeHint } from "@/lib/arena/badges/types";
import RecognitionBadgeList from "@/components/arena/RecognitionBadgeList";
import RecognitionBadge from "@/components/arena/RecognitionBadge";
import { RECOGNITION_BADGES } from "@/lib/arena/badges/types";

export default function BuilderRecognitionPage() {
  const [badges, setBadges] = useState<RecognitionBadgeGrant[]>([]);
  const [nextBadge, setNextBadge] = useState<NextBadgeHint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMyRecognition();
        setBadges(data.badges);
        setNextBadge(data.nextBadge);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recognition");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const allBadgeKeys = Object.keys(RECOGNITION_BADGES) as Array<keyof typeof RECOGNITION_BADGES>;
  const earnedKeys = new Set(badges.map((b) => b.key));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 px-6 pt-16 pb-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/builder/dashboard"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white mb-6 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Recognition</h1>
          <p className="mt-2 text-slate-400 font-medium max-w-xl">
            Badges earned through trust, momentum, responsiveness, and engagement — never competition.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 -mt-8 pb-16 space-y-6">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center animate-pulse">
            <div className="mx-auto h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
        ) : (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">
                Your Badges
              </h2>
              {badges.length > 0 ? (
                <RecognitionBadgeList badges={badges} size="md" />
              ) : (
                <p className="text-sm text-slate-500 font-medium">
                  No badges yet. Publish AI Solutions, deliver great work, and stay active to earn recognition.
                </p>
              )}
            </div>

            {nextBadge && (
              <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">
                  Next Badge to Earn
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl" aria-hidden="true">{nextBadge.emoji}</span>
                  <p className="text-lg font-black text-slate-900">{nextBadge.label}</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{nextBadge.hint}</p>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">
                All Recognition Badges
              </h2>
              <div className="space-y-4">
                {allBadgeKeys.map((key) => {
                  const def = RECOGNITION_BADGES[key];
                  const earned = earnedKeys.has(key);
                  return (
                    <div
                      key={key}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border p-4 ${
                        earned ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-slate-50/50"
                      }`}
                    >
                      <RecognitionBadge badge={{ ...def, grantedAt: "", source: def.auto ? "auto" : "admin" }} size="md" />
                      <p className="text-xs text-slate-500 flex-1">{def.description}</p>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${
                          earned ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {earned ? "Earned" : def.auto ? "Auto" : "Admin only"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
