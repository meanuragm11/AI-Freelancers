"use client";

import React, { memo } from "react";
import Image from "@/components/RemoteImage";
import Link from "next/link";

type AssetCardProps = {
  asset: {
    id: string;
    title: string;
    category: string;
    thumbnail_url?: string;
    price_usd: number;
    sales_count: number;
    builder?: {
      full_name: string;
    };
  };
  index?: number;
};

function AssetCardComponent({ asset, index = 0 }: AssetCardProps) {
  const price = asset.price_usd || 0;
  const sales = asset.sales_count || 0;
  const builderName = asset.builder?.full_name || "Unknown";

  return (
    <Link
      href={`/buyer/components/${asset.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08),0_20px_48px_rgba(15,23,42,0.12)] focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:ring-offset-2 animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
      style={{ animationDelay: `${index * 60}ms`, animationDuration: "500ms" }}
      aria-label={`${asset.title} by ${builderName}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-100">
        {asset.thumbnail_url ? (
          <Image
            src={asset.thumbnail_url}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 20vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            alt={asset.title}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-blue-100">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-widest">AI Asset</span>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-md bg-white/90 text-slate-600 ring-1 ring-white/20">
            {asset.category || "Asset"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
          {asset.title}
        </h3>

        {/* Builder */}
        <p className="mb-4 text-xs font-medium text-slate-500">
          by {builderName}
        </p>

        {/* Price & sales */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
            {price === 0 ? (
              <p className="text-base font-black text-green-600">FREE</p>
            ) : (
              <p className="text-base font-black text-slate-900 tabular-nums">${price}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Sales</p>
            <p className="text-xs font-black text-blue-600 tabular-nums">{sales}</p>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          aria-label={`View ${asset.title}`}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          View Asset
        </button>
      </div>
    </Link>
  );
}

export const AssetCard = memo(AssetCardComponent);
