"use client";

import React, { memo } from "react";

function ServiceCardSkeletonComponent({ index = 0 }: { index?: number }) {
  return (
    <div
      className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] animate-in fade-in fill-mode-both"
      style={{ animationDelay: `${index * 50}ms`, animationDuration: "400ms" }}
      aria-hidden="true"
    >
      <div className="relative h-[72px] w-full shrink-0 overflow-hidden bg-slate-100">
        <div className="absolute inset-0 animate-pulse bg-slate-200/70" />
        <div className="absolute inset-x-0 top-0 flex justify-between p-2.5">
          <div className="h-4 w-16 rounded-full bg-slate-200/80" />
          <div className="h-4 w-12 rounded-full bg-slate-200/80" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <div className="mb-3 flex items-start gap-2.5">
          <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 animate-pulse ring-1 ring-slate-100" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-36 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>

        <div className="mb-3 min-h-[2.75rem] space-y-2">
          <div className="h-4 w-full rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-[85%] rounded bg-slate-200 animate-pulse" />
        </div>

        <div className="mb-3 min-h-[2.5rem] flex-1 space-y-2">
          <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-[92%] rounded bg-slate-100 animate-pulse" />
        </div>

        <div className="mb-3 min-h-[2.25rem] space-y-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 w-3 rounded-sm bg-slate-200 animate-pulse" />
            ))}
          </div>
          <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
        </div>

        <div className="mt-auto shrink-0 border-t border-slate-100 pt-3">
          <div className="mb-3 rounded-xl bg-slate-100 px-3.5 py-2.5">
            <div className="h-2.5 w-14 rounded bg-slate-200 animate-pulse" />
            <div className="mt-2 h-7 w-16 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-10 w-full rounded-xl bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export const ServiceCardSkeleton = memo(ServiceCardSkeletonComponent);
