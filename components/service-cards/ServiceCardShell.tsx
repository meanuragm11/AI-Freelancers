"use client";

import React, { memo } from "react";
import Image from "next/image";
import { isDisplayableImageUrl } from "@/lib/images";

export type ServiceCardShellProps = {
  category: string;
  coverImage?: string;
  serviceTitle: string;
  serviceDescription: string;
  fullName?: string;
  headline?: string;
  avatarUrl?: string;
  price: number;
  calculatedRating: number;
  reviewCount: number;
  deliveryTimeDays: number;
  completedProjects: number;
  isVerified: boolean;
  isTopExpert: boolean;
  isFastResponse?: boolean;
  responseTimeLabel?: string;
  index?: number;
  className?: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  const filledCount = Math.round(Math.min(5, Math.max(0, rating)));

  return (
    <div className="flex items-center gap-1.5" aria-label={`${rating.toFixed(1)} out of 5 stars, ${count} reviews`}>
      <div className="flex" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`h-3 w-3 ${i < filledCount ? "text-amber-400" : "text-slate-200"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[11px] font-bold text-slate-700 tabular-nums">{rating.toFixed(1)}</span>
      <span className="text-[11px] font-medium text-slate-400 tabular-nums">({count})</span>
    </div>
  );
}

function TrustBadge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "verified" | "top" | "fast";
}) {
  const styles = {
    default: "bg-white/95 text-slate-600 ring-slate-200/60",
    verified: "bg-emerald-500/95 text-white ring-emerald-400/30",
    top: "bg-amber-500/95 text-white ring-amber-400/30",
    fast: "bg-blue-500/95 text-white ring-blue-400/30",
  };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-sm ring-1 ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function ServiceCardShellComponent({
  category,
  coverImage,
  serviceTitle,
  serviceDescription,
  fullName,
  headline,
  avatarUrl,
  price,
  calculatedRating,
  reviewCount,
  deliveryTimeDays,
  completedProjects,
  isVerified,
  isTopExpert,
  isFastResponse,
  responseTimeLabel,
  index = 0,
  className = "",
  children,
  footer,
}: ServiceCardShellProps) {
  const displayName = fullName?.trim() || "Verified Expert";
  const displayHeadline = headline?.trim() || category;
  const safeCoverImage = isDisplayableImageUrl(coverImage) ? coverImage : undefined;
  const safeAvatarUrl = isDisplayableImageUrl(avatarUrl) ? avatarUrl : undefined;

  return (
    <div
      className={`group relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.1)] animate-in fade-in slide-in-from-bottom-2 fill-mode-both ${className}`}
      style={{ animationDelay: `${index * 50}ms`, animationDuration: "450ms" }}
    >
      {/* Compact cover */}
      <div className="relative h-[72px] w-full shrink-0 overflow-hidden bg-slate-100">
        {safeCoverImage ? (
          <Image
            src={safeCoverImage}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            alt={serviceTitle}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/80 to-indigo-100/80">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="h-5 w-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">AI Service</span>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <TrustBadge variant="default">{category}</TrustBadge>
          <TrustBadge variant="default">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
            Live
          </TrustBadge>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
        {/* Expert row */}
        <div className="mb-3 flex items-start gap-2.5">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200/80 transition-shadow duration-300 group-hover:ring-blue-200">
            {safeAvatarUrl ? (
              <Image
                src={safeAvatarUrl}
                fill
                sizes="40px"
                className="object-cover"
                alt={displayName}
                loading="lazy"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-black uppercase text-slate-500">
                {displayName.charAt(0) || "?"}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-2 text-[13px] font-black leading-snug text-slate-900">{displayName}</h4>
            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium leading-snug text-slate-500">{displayHeadline}</p>
          </div>
        </div>

        {/* Trust chips */}
        {(isTopExpert || isVerified || isFastResponse) && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {isTopExpert && (
              <TrustBadge variant="top">
                <svg className="h-2.5 w-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Top Expert
              </TrustBadge>
            )}
            {isVerified && (
              <TrustBadge variant="verified">
                <svg className="h-2.5 w-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </TrustBadge>
            )}
            {isFastResponse && <TrustBadge variant="fast">Fast Response</TrustBadge>}
          </div>
        )}

        {/* Title & description — fixed clamp heights for alignment */}
        <h3 className="mb-2 line-clamp-2 min-h-[2.75rem] text-[15px] font-black leading-snug tracking-tight text-slate-900">
          {serviceTitle}
        </h3>
        <p className="mb-3 line-clamp-2 min-h-[2.5rem] flex-1 text-xs leading-relaxed text-slate-500">
          {serviceDescription}
        </p>

        {/* Meta row — consistent height */}
        <div className="mb-3 min-h-[2.25rem] space-y-1.5">
          {calculatedRating > 0 ? (
            <StarRating rating={calculatedRating} count={reviewCount} />
          ) : (
            <p className="text-[11px] font-semibold text-slate-400">New expert · No reviews yet</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {responseTimeLabel && (
              <span className="inline-flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {responseTimeLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {deliveryTimeDays}d delivery
            </span>
            {completedProjects > 0 && (
              <span>{completedProjects} completed</span>
            )}
          </div>
        </div>

        {children}

        {/* Footer — price + CTAs pinned to bottom */}
        <div className="mt-auto shrink-0 border-t border-slate-100 pt-3">
          <div className="mb-3 flex items-end justify-between gap-3 rounded-xl bg-slate-950 px-3.5 py-2.5 text-white">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Starting at</p>
              <p className="text-2xl font-black leading-none tracking-tight tabular-nums">${price}</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-300">
              Fixed Price
            </span>
          </div>
          {footer}
        </div>
      </div>
    </div>
  );
}

export const ServiceCardShell = memo(ServiceCardShellComponent);

export const serviceCardPrimaryButtonClass =
  "w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all duration-200 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]";

export const serviceCardSecondaryButtonClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]";
