"use client";

import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { BuilderPublishedService } from "@/types/profile";
import { isDisplayableImageUrl } from "@/lib/images";

type ProfileServiceCardProps = {
  service: BuilderPublishedService;
  index?: number;
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`h-3 w-3 ${i < filled ? "text-amber-400" : "text-slate-200"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[11px] font-bold text-slate-700 tabular-nums">{rating.toFixed(1)}</span>
      <span className="text-[11px] text-slate-400 tabular-nums">({count})</span>
    </div>
  );
}

function ProfileServiceCardComponent({ service, index = 0 }: ProfileServiceCardProps) {
  const thumbnail = isDisplayableImageUrl(service.cover_image_url)
    ? service.cover_image_url
    : isDisplayableImageUrl(service.banner_image_url)
      ? service.banner_image_url
      : undefined;
  const rating = Number(service.rating_avg ?? 0);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.1)] animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${index * 50}ms`, animationDuration: "450ms" }}
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-100">
        {thumbnail ? (
          <Image
            src={thumbnail}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            alt={service.title}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/80 to-indigo-100/80">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">AI Service</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex justify-between gap-2 p-3">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 ring-1 ring-slate-200/60 backdrop-blur-sm">
            {service.category || "AI Service"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-black leading-snug text-slate-900">{service.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-500">
          {service.short_description || "Professional AI service delivery."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Starting at</p>
            <p className="mt-0.5 font-black text-slate-900 tabular-nums">
              ${Number(service.starting_price_usd).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Delivery</p>
            <p className="mt-0.5 font-black text-slate-900">{service.delivery_time_days} days</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {rating > 0 ? (
            <StarRating rating={rating} count={service.review_count ?? 0} />
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">New · No reviews yet</span>
          )}
          {(service.order_count ?? 0) > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {service.order_count} orders
            </span>
          )}
        </div>

        <Link
          href={`/service/${service.id}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98]"
        >
          View Service
        </Link>
      </div>
    </article>
  );
}

export const ProfileServiceCard = memo(ProfileServiceCardComponent);
