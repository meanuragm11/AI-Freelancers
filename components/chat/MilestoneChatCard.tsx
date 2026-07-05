"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MilestoneChatCardProps = {
  milestoneId: string;
  event: "created" | "funded" | "released";
  userRole: "buyer" | "builder";
};

function formatMoney(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Awaiting Funding";
    case "funded":
      return "In Escrow";
    case "in_progress":
      return "In Progress";
    case "submitted":
      return "In Review";
    case "released":
    case "completed":
      return "Released";
    default:
      return status.replace("_", " ");
  }
}

export default function MilestoneChatCard({ milestoneId, event, userRole }: MilestoneChatCardProps) {
  const router = useRouter();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMilestone = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/card`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load milestone");
      setPayload(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load milestone");
    } finally {
      setLoading(false);
    }
  }, [milestoneId]);

  useEffect(() => {
    void loadMilestone();
  }, [loadMilestone]);

  if (loading) {
    return (
      <div className="my-2 h-24 min-w-[280px] max-w-xl animate-pulse rounded-2xl bg-slate-100" />
    );
  }

  if (!payload?.milestone) {
    return (
      <div className="my-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
        {error || "Milestone unavailable"}
      </div>
    );
  }

  const milestone = payload.milestone;
  const eventBadge =
    event === "created"
      ? "Milestone Added"
      : event === "funded"
        ? "Escrow Funded"
        : "Payment Released";

  return (
    <div className="my-2 w-full min-w-[280px] max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="border-b bg-slate-50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Milestone Update</p>
            <h4 className="mt-1 text-base font-black leading-snug">{milestone.title}</h4>
          </div>
          <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">
            {eventBadge}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        <p className="text-sm leading-relaxed text-slate-600">{milestone.description || "No description provided."}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Amount</p>
            <p className="mt-1 text-xl font-black text-blue-600">{formatMoney(milestone.amount_usd)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Status</p>
            <p className="mt-1 text-sm font-black text-slate-900">{statusLabel(milestone.status)}</p>
          </div>
        </div>

        {milestone.is_new_milestone && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Added after initial agreement</p>
        )}

        {userRole === "buyer" && milestone.status === "draft" && (
          <button
            type="button"
            onClick={() => router.push(`/checkout/escrow/${milestone.id}`)}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600"
          >
            Fund This Milestone
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push(`/collab/${milestone.collab_id}`)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
        >
          Open Workspace
        </button>
      </div>
    </div>
  );
}
