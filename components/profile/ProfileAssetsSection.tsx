"use client";

import React from "react";
import type { BuilderPublishedComponent } from "@/types/profile";
import { ProfileAssetCard } from "./ProfileAssetCard";

type ProfileAssetsSectionProps = {
  components: BuilderPublishedComponent[];
};

export default function ProfileAssetsSection({ components }: ProfileAssetsSectionProps) {
  if (components.length === 0) return null;

  return (
    <section id="assets" className="scroll-mt-28">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">AI Assets & Components</h2>
          <p className="mt-1 text-sm text-slate-500">Production-ready components available in the asset store</p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
          {components.length} published
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((asset, index) => (
          <ProfileAssetCard key={asset.id} asset={asset} index={index} />
        ))}
      </div>
    </section>
  );
}
