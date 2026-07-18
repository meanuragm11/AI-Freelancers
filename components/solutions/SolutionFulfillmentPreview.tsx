"use client";

import React from "react";
import type { SolutionCapabilityInput } from "@/lib/solutions/capabilities";
import { deriveSolutionCapabilities, SOLUTION_CAPABILITY_META } from "@/lib/solutions/capabilities";

type SolutionFulfillmentPreviewProps = {
  service: SolutionCapabilityInput;
  owned: boolean;
};

export default function SolutionFulfillmentPreview({ service, owned }: SolutionFulfillmentPreviewProps) {
  const deliveryModel = service.delivery_model ?? "collaborative";
  if (deliveryModel !== "instant") return null;

  const capabilities = deriveSolutionCapabilities(service);
  const hasDigital = capabilities.some(
    (c) => c === "instant_download" || c === "secure_delivery"
  );
  if (!hasDigital) return null;

  const items = [
    capabilities.includes("instant_download") && {
      key: "download",
      label: "Digital Download Package",
      icon: "📦",
    },
    capabilities.includes("secure_delivery") && {
      key: "secure",
      label: "Secure Payload / Link",
      icon: "🔐",
    },
  ].filter(Boolean) as Array<{ key: string; label: string; icon: string }>;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black text-slate-900">Digital Fulfillment</h2>
      <p className="mt-2 text-sm text-slate-600">
        {owned
          ? "Your purchase is active — open this solution in your library to access all content."
          : "Secure content is included with this AI Solution and unlocks automatically after purchase."}
      </p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-4 rounded-2xl border p-4 ${
              owned
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {owned ? "✅" : item.icon}
            </span>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">
                {owned ? "Unlocked in your workspace library" : "Locked until purchase"}
              </p>
            </div>
            {!owned && (
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                Locked
              </span>
            )}
          </div>
        ))}
      </div>
      {!owned && (
        <p className="mt-4 text-[10px] font-medium text-slate-400">
          No builder intervention required — fulfillment unlocks instantly in{" "}
          <span className="font-bold text-slate-500">Buyer Library</span>.
        </p>
      )}
    </section>
  );
}

export function SolutionCapabilityLegend() {
  return (
    <div className="flex flex-wrap gap-3">
      {(["instant_download", "secure_delivery", "customizable", "open_source", "premium"] as const).map(
        (cap) => (
          <span key={cap} className="text-[10px] text-slate-500">
            <span className="font-black text-slate-700">{SOLUTION_CAPABILITY_META[cap].label}</span>
            {" — "}
            {SOLUTION_CAPABILITY_META[cap].description}
          </span>
        )
      )}
    </div>
  );
}
