"use client";

import React, { memo } from "react";
import Image from "@/components/RemoteImage";
import { isDisplayableImageUrl } from "@/lib/images";

export type ServiceBrowseCardProps = {
  category: string;
  coverImage?: string;
  serviceTitle: string;
  fullName?: string;
  headline?: string;
  avatarUrl?: string;
  price: number;
  calculatedRating: number;
  reviewCount: number;
  deliveryTimeDays: number;
  isVerified: boolean;
  isTopExpert: boolean;
  index?: number;
  className?: string;
  footer?: React.ReactNode;
  showViewDetails?: boolean;
};

function CategoryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-[calc(100%-0.5rem)] items-center truncate rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm">
      {children}
    </span>
  );
}

function StatusPill({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "top" | "verified";
}) {
  const styles = {
    top: "bg-amber-500/95 text-white ring-amber-400/30",
    verified: "bg-emerald-500/95 text-white ring-emerald-400/30",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm ring-1 ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const filledCount = Math.round(Math.min(5, Math.max(0, rating)));

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${rating.toFixed(1)} out of 5 stars, ${count} reviews`}
    >
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
      <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{rating.toFixed(1)}</span>
      <span className="text-[11px] text-slate-400 tabular-nums">({count})</span>
    </div>
  );
}

function ServiceBrowseCardComponent({
  category,
  coverImage,
  serviceTitle,
  fullName,
  headline,
  avatarUrl,
  price,
  calculatedRating,
  reviewCount,
  deliveryTimeDays,
  isVerified,
  isTopExpert,
  index = 0,
  className = "",
  footer,
  showViewDetails = false,
}: ServiceBrowseCardProps) {
  const displayName = fullName?.trim() || "Verified Expert";
  const displayHeadline = headline?.trim() || category;
  const safeCoverImage = isDisplayableImageUrl(coverImage) ? coverImage : undefined;
  const safeAvatarUrl = isDisplayableImageUrl(avatarUrl) ? avatarUrl : undefined;

  const statusBadge = isTopExpert ? (
    <StatusPill variant="top">Top Expert</StatusPill>
  ) : isVerified ? (
    <StatusPill variant="verified">Verified</StatusPill>
  ) : null;

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-bottom-1 fill-mode-both ${className}`}
      style={{ animationDelay: `${index * 40}ms`, animationDuration: "400ms" }}
    >
      {/* 16:9 thumbnail */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-t-xl bg-slate-100">
        {safeCoverImage ? (
          <Image
            src={safeCoverImage}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 25vw, 16vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            alt={serviceTitle}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/80 to-indigo-100/80">
            <div className="flex items-center gap-1.5 text-slate-400">
              <svg
                className="h-4 w-4 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-wider">AI Service</span>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1.5 p-2">
          <CategoryPill>{category}</CategoryPill>
          {statusBadge}
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2.5">
        {/* Builder row */}
        <div className="mb-2 flex items-center gap-2">
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
            {safeAvatarUrl ? (
              <Image
                src={safeAvatarUrl}
                fill
                sizes="28px"
                className="object-cover"
                alt={displayName}
                loading="lazy"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-[10px] font-bold uppercase text-slate-500">
                {displayName.charAt(0) || "?"}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-slate-800">{displayName}</p>
            <p className="truncate text-[10px] text-slate-500">{displayHeadline}</p>
          </div>
        </div>

        {/* Service title */}
        <h3 className="mb-1.5 line-clamp-2 text-[13px] font-bold leading-snug tracking-tight text-slate-900">
          {serviceTitle}
        </h3>

        {/* Rating */}
        <div className="mb-2">
          {calculatedRating > 0 ? (
            <StarRating rating={calculatedRating} count={reviewCount} />
          ) : (
            <p className="text-[10px] text-slate-400">No reviews yet</p>
          )}
        </div>

        {/* Delivery + Price */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200/60">
            <span aria-hidden="true">📅</span>
            {deliveryTimeDays} {deliveryTimeDays === 1 ? "Day" : "Days"}
          </span>
          <p className="text-sm font-bold tabular-nums text-slate-900">${price}</p>
        </div>

        {showViewDetails && (
          <p className="mt-2 text-[11px] font-medium text-blue-600 transition-colors group-hover:text-blue-700">
            View Details →
          </p>
        )}

        {footer && <div className="mt-2">{footer}</div>}
      </div>
    </div>
  );
}

export const ServiceBrowseCard = memo(ServiceBrowseCardComponent);
