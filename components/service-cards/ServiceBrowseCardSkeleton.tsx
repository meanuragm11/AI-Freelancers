"use client";

import React, { memo } from "react";

function ServiceBrowseCardSkeletonComponent({ index = 0 }: { index?: number }) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] animate-in fade-in fill-mode-both"
      style={{ animationDelay: `${index * 40}ms`, animationDuration: "400ms" }}
      aria-hidden="true"
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-t-xl bg-slate-100">
        <div className="absolute inset-0 animate-pulse bg-slate-200/70" />
        <div className="absolute inset-x-0 top-0 flex justify-between p-2">
          <div className="h-4 w-16 rounded-full bg-slate-200/80" />
          <div className="h-4 w-14 rounded-full bg-slate-200/80" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200 animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-2 w-32 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>

        <div className="mb-1.5 space-y-1">
          <div className="h-3.5 w-full rounded bg-slate-200 animate-pulse" />
          <div className="h-3.5 w-[80%] rounded bg-slate-200 animate-pulse" />
        </div>

        <div className="mb-2 flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 w-3 rounded-sm bg-slate-200 animate-pulse" />
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="h-5 w-16 rounded-md bg-slate-100 animate-pulse" />
          <div className="h-4 w-10 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export const ServiceBrowseCardSkeleton = memo(ServiceBrowseCardSkeletonComponent);
