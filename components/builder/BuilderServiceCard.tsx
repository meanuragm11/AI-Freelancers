"use client";

import React from "react";
import Image from "next/image";
import type { Service, ServiceStatus } from "@/types/marketplace";
import { statusBadgeClass, statusLabel } from "@/lib/services/form";

type BuilderServiceCardProps = {
  service: Service;
  onEdit: (service: Service) => void;
  onDuplicate: (service: Service) => void;
  onTogglePublish: (service: Service) => void;
  onArchive: (service: Service) => void;
  onRestore: (service: Service) => void;
  busy?: boolean;
};

export default function BuilderServiceCard({
  service,
  onEdit,
  onDuplicate,
  onTogglePublish,
  onArchive,
  onRestore,
  busy,
}: BuilderServiceCardProps) {
  const thumbnail = service.cover_image_url || service.banner_image_url || "";
  const rating = Number(service.rating_avg ?? 0);
  const isArchived = service.status === "archived";

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] bg-slate-100">
        {thumbnail ? (
          <Image src={thumbnail} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" alt={service.title} />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
            No Thumbnail
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${statusBadgeClass(service.status as ServiceStatus)}`}
          >
            {statusLabel(service.status as ServiceStatus)}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
            {service.category || "AI Service"}
          </p>
          <h3 className="mt-1 line-clamp-2 text-lg font-black leading-snug text-slate-900">{service.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{service.short_description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Price</p>
            <p className="mt-1 font-black text-slate-900">${Number(service.starting_price_usd).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Delivery</p>
            <p className="mt-1 font-black text-slate-900">{service.delivery_time_days} days</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Orders</p>
            <p className="mt-1 font-black text-slate-900">{service.order_count ?? 0}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Views</p>
            <p className="mt-1 font-black text-slate-900">{service.view_count ?? 0}</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</p>
          <p className="text-sm font-black text-amber-600">
            {rating > 0 ? `${rating.toFixed(1)} ★` : "No ratings yet"}
            {service.review_count ? ` · ${service.review_count}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/service/${service.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100"
          >
            View
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(service)}
            className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDuplicate(service)}
            className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Duplicate
          </button>
          {isArchived ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRestore(service)}
              className="rounded-lg bg-emerald-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
            >
              Restore
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onTogglePublish(service)}
                className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 ${
                  service.status === "published"
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                }`}
              >
                {service.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onArchive(service)}
                className="rounded-lg bg-rose-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-200 disabled:opacity-50"
              >
                Archive
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
