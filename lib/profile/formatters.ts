import type { AvailabilityStatus } from "@/types/profile";

export function formatResponseTimeLabel(hours: number | null | undefined): string {
  if (hours == null) return "Typically responds within 24 hrs";
  if (hours <= 1) return "< 1 hr response";
  if (hours <= 2) return "< 2 hrs response";
  if (hours <= 4) return "< 4 hrs response";
  if (hours <= 24) return "Within 24 hrs";
  return `${Math.round(hours)} hr response`;
}

export function formatMemberSince(date: string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatCompletionDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function availabilityLabel(status: AvailabilityStatus): string {
  switch (status) {
    case "available":
      return "Available for new projects";
    case "limited":
      return "Limited availability";
    case "unavailable":
      return "Currently unavailable";
    default:
      return "Availability unknown";
  }
}

export function availabilityBadgeClass(status: AvailabilityStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "limited":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "unavailable":
      return "bg-slate-100 text-slate-500 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-500 ring-slate-200";
  }
}
