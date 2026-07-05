"use client";

import React from "react";
import type { BuilderPublishedService } from "@/types/profile";
import { ProfileServiceCard } from "./ProfileServiceCard";

type ProfileServicesSectionProps = {
  services: BuilderPublishedService[];
};

export default function ProfileServicesSection({ services }: ProfileServicesSectionProps) {
  return (
    <section id="services" className="scroll-mt-28">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Services Offered</h2>
          <p className="mt-1 text-sm text-slate-500">Published services available for purchase</p>
        </div>
        {services.length > 0 && (
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
            {services.length} live
          </span>
        )}
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">No published services</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            This builder has not published any services on Zelance yet.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-5 ${
            services.length >= 3
              ? "sm:grid-cols-2 xl:grid-cols-3"
              : services.length === 2
                ? "sm:grid-cols-2"
                : "max-w-md"
          }`}
        >
          {services.map((service, index) => (
            <ProfileServiceCard key={service.id} service={service} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
