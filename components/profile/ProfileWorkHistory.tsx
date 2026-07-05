"use client";

import React from "react";
import Image from "next/image";
import type { CompletedProjectReview } from "@/types/profile";
import { formatCompletionDate, getInitials } from "@/lib/profile/formatters";
import { isDisplayableImageUrl } from "@/lib/images";

type ProfileWorkHistoryProps = {
  workHistory: CompletedProjectReview[];
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-current" : "fill-none text-slate-300"}`}
          viewBox="0 0 20 20"
          stroke="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProfileWorkHistory({ workHistory }: ProfileWorkHistoryProps) {
  return (
    <section id="work-history" className="scroll-mt-28">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Zelance Platform History</h2>
          <p className="mt-1 text-sm text-slate-500">Verified completed projects and buyer reviews</p>
        </div>
        {workHistory.length > 0 && (
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {workHistory.length} project{workHistory.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {workHistory.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">No completed projects yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Completed projects with buyer reviews will appear here once work is delivered on Zelance.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {workHistory.map((work) => {
            const buyerAvatar = isDisplayableImageUrl(work.buyer_avatar_url) ? work.buyer_avatar_url : undefined;
            return (
              <article
                key={work.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="absolute right-0 top-0 rounded-bl-xl border-b border-l border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Verified Project
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 pr-4 pt-1">
                    <h3 className="text-lg font-black text-slate-900">{work.service_name}</h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Completed {formatCompletionDate(work.completed_at)}
                    </p>
                  </div>
                  {work.amount_usd != null && work.amount_usd > 0 && (
                    <div className="shrink-0 rounded-xl bg-slate-50 px-4 py-2 text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Project Value</p>
                      <p className="text-sm font-black text-slate-900 tabular-nums">
                        ${work.amount_usd.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white">
                      {buyerAvatar ? (
                        <Image src={buyerAvatar} fill className="object-cover" alt={work.buyer_name} sizes="40px" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-black text-slate-500">
                          {getInitials(work.buyer_name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900">{work.buyer_name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StarRow rating={work.rating} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Buyer Review
                        </span>
                      </div>
                    </div>
                  </div>
                  {work.review ? (
                    <p className="mt-3 text-sm italic leading-relaxed text-slate-600">&ldquo;{work.review}&rdquo;</p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">No written review provided.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
