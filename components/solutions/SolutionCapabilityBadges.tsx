"use client";

import React from "react";
import {
  deriveSolutionCapabilities,
  SOLUTION_CAPABILITY_META,
  type SolutionCapabilityInput,
} from "@/lib/solutions/capabilities";

type SolutionCapabilityBadgesProps = {
  service: SolutionCapabilityInput;
  size?: "sm" | "md";
  className?: string;
};

export default function SolutionCapabilityBadges({
  service,
  size = "md",
  className = "",
}: SolutionCapabilityBadgesProps) {
  const capabilities = deriveSolutionCapabilities(service);

  if (capabilities.length === 0) return null;

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[9px]"
      : "px-3 py-1 text-[10px]";

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {capabilities.map((cap) => {
        const meta = SOLUTION_CAPABILITY_META[cap];
        return (
          <span
            key={cap}
            title={meta.description}
            className={`inline-flex items-center rounded-full border font-black uppercase tracking-widest ${sizeClasses} ${meta.className}`}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
