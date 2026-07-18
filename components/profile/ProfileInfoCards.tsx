"use client";

import React from "react";
import Image from "@/components/RemoteImage";
import type { BuilderProfileView } from "@/types/profile";
import {
  availabilityBadgeClass,
  availabilityLabel,
  formatMemberSince,
  formatResponseTimeLabel,
  getInitials,
} from "@/lib/profile/formatters";
import { isDisplayableImageUrl } from "@/lib/images";

type ProfileInfoCardsProps = {
  profile: BuilderProfileView;
  serviceCount: number;
  displayName?: string;
};

function StatCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black tabular-nums ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default function ProfileInfoCards({ profile, serviceCount, displayName }: ProfileInfoCardsProps) {
  const avatarUrl = isDisplayableImageUrl(profile.avatar_url) ? profile.avatar_url : undefined;
  const name = displayName ?? profile.full_name;

  return (
    <div className="space-y-6">
      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Services" value={serviceCount} />
        <StatCard label="Completed" value={profile.completed_projects ?? 0} />
        <StatCard
          label="Avg Rating"
          value={
            profile.average_rating > 0 ? (
              <span className="flex items-center gap-1 text-amber-600">
                ★ {profile.average_rating.toFixed(1)}
              </span>
            ) : (
              "—"
            )
          }
          accent={profile.average_rating > 0 ? "text-amber-600" : undefined}
        />
        <StatCard label="Reviews" value={profile.review_count ?? 0} />
      </div>

      {/* Detail cards */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Profile Details</h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-slate-400" aria-hidden="true">●</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Availability</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${availabilityBadgeClass(profile.availability_status)}`}
              >
                {availabilityLabel(profile.availability_status)}
              </span>
            </div>
          </div>

          {profile.location && (
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
                <p className="font-semibold text-slate-700">{profile.location}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Member Since</p>
              <p className="font-semibold text-slate-700">{formatMemberSince(profile.created_at)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Response Time</p>
              <p className="font-semibold text-slate-700">
                {formatResponseTimeLabel(profile.average_response_hours)}
              </p>
            </div>
          </div>

          {profile.languages?.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Languages</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.languages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification */}
      {(profile.is_verified || profile.is_top_expert) && (
        <div className="flex flex-wrap gap-2">
          {profile.is_verified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified Expert
            </span>
          )}
          {profile.is_top_expert && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
              ★ Top Expert
            </span>
          )}
        </div>
      )}

      {/* Mini avatar card for sidebar context on mobile */}
      <div className="hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:block">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-200">
            {avatarUrl ? (
              <Image src={avatarUrl} fill className="object-cover" alt={name} sizes="48px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-black text-slate-500">
                {getInitials(name)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{profile.headline || "AI Builder"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
