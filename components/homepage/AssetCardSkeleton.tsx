"use client";

import React, { memo } from "react";

function AssetCardSkeletonComponent({ index = 0 }: { index?: number }) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] animate-in fade-in fill-mode-both"
      style={{ animationDelay: `${index * 60}ms`, animationDuration: "400ms" }}
      aria-hidden="true"
    >
      {/* Thumbnail skeleton */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-100">
        <div className="absolute inset-0 animate-pulse bg-slate-200/70" />
        <div className="absolute inset-x-0 top-0 flex justify-start p-3">
          <div className="h-5 w-20 rounded-full bg-slate-200/80" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Title */}
        <div className="mb-2 space-y-2">
          <div className="h-5 w-full rounded-md bg-slate-200 animate-pulse" />
          <div className="h-5 w-[70%] rounded-md bg-slate-200 animate-pulse" />
        </div>

        {/* Builder */}
        <div className="mb-4 h-3 w-32 rounded bg-slate-100 animate-pulse" />

        {/* Price & sales */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <div className="h-2.5 w-12 rounded bg-slate-200 animate-pulse mb-1" />
            <div className="h-6 w-16 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="text-right">
            <div className="h-2.5 w-10 rounded bg-slate-100 animate-pulse mb-1" />
            <div className="h-4 w-8 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}

export const AssetCardSkeleton = memo(AssetCardSkeletonComponent);
