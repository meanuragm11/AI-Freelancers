"use client";

import React, { memo } from "react";
import Image from "@/components/RemoteImage";
import Link from "next/link";
import type { BuilderPublishedComponent } from "@/types/profile";
import { isDisplayableImageUrl } from "@/lib/images";

type ProfileAssetCardProps = {
  asset: BuilderPublishedComponent;
  index?: number;
};

function ProfileAssetCardComponent({ asset, index = 0 }: ProfileAssetCardProps) {
  const thumbnail = isDisplayableImageUrl(asset.thumbnail_url) ? asset.thumbnail_url : undefined;
  const price = Number(asset.price_usd ?? 0);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.12)] animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${index * 60}ms`, animationDuration: "500ms" }}
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-slate-100">
        {thumbnail ? (
          <Image
            src={thumbnail}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            alt={asset.title}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-blue-100">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">AI Asset</span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-white/20 backdrop-blur-md">
            {asset.category || "Asset"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600">
          {asset.title}
        </h3>

        <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Price</p>
            <p className={`text-base font-black tabular-nums ${price === 0 ? "text-green-600" : "text-slate-900"}`}>
              {price === 0 ? "FREE" : `$${price.toLocaleString()}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Sales</p>
            <p className="text-xs font-black text-blue-600 tabular-nums">{asset.sales_count ?? 0}</p>
          </div>
        </div>

        <Link
          href={`/buyer/components/${asset.id}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
        >
          View Asset
        </Link>
      </div>
    </article>
  );
}

export const ProfileAssetCard = memo(ProfileAssetCardComponent);
