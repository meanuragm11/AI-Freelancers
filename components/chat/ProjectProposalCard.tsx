"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { ProposalCardPayload, ProposalMilestone } from "@/lib/project-proposals/types";

type ProjectProposalCardProps = {
  negotiationId: string;
  userRole: "buyer" | "builder";
  currentUserId: string;
  onFocusComposer?: () => void;
  onUpdated?: () => void;
};

function formatMoney(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

export default function ProjectProposalCard({
  negotiationId,
  userRole,
  currentUserId,
  onFocusComposer,
  onUpdated,
}: ProjectProposalCardProps) {
  const [payload, setPayload] = useState<ProposalCardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [showNegotiate, setShowNegotiate] = useState(false);
  const [proposedAmount, setProposedAmount] = useState("");
  const [explanation, setExplanation] = useState("");
  const [milestones, setMilestones] = useState<ProposalMilestone[]>([]);

  const loadProposal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/project-proposals/negotiations/${negotiationId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load proposal");
      setPayload(result);
      setProposedAmount(String(result.negotiation.proposed_amount_usd ?? result.negotiation.proposal_snapshot.budget_usd ?? ""));
      setMilestones(result.negotiation.proposed_milestones ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  }, [negotiationId]);

  useEffect(() => {
    void loadProposal();
  }, [loadProposal]);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!payload) return;
    setActing(true);
    setError(null);
    try {
      const response = await fetch("/api/project-proposals/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          negotiation_id: payload.negotiation.id,
          project_request_id: payload.projectRequest.id,
          ...extra,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");
      setShowNegotiate(false);
      await loadProposal();
      onUpdated?.();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!payload) return;
    setActing(true);
    try {
      const response = await fetch(`/api/project-requests/${payload.projectRequest.id}/prepare-checkout`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to start checkout");
      window.location.href = result.checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed");
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="my-2 w-full min-w-[300px] max-w-xl rounded-2xl border border-slate-200 bg-white p-5 text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
        Loading proposal...
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="my-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
        {error || "Proposal unavailable"}
      </div>
    );
  }

  const snapshot = payload.negotiation.proposal_snapshot;
  const isProposer = payload.negotiation.proposed_by === currentUserId;
  const isAcceptedTerms =
    payload.projectRequest.accepted_negotiation_id === payload.negotiation.id;
  const locked = payload.isLocked && isAcceptedTerms;
  const awaitingPayment =
    payload.isAwaitingPayment && userRole === "buyer" && isAcceptedTerms;
  const canAct =
    !locked &&
    payload.negotiation.status === "pending" &&
    ["pending", "negotiating"].includes(payload.projectRequest.status);
  const amountChanged =
    payload.previousVersion &&
    payload.previousVersion.proposed_amount_usd !== payload.negotiation.proposed_amount_usd;

  const statusBadge = locked
    ? "Accepted & Funded"
    : payload.isSuperseded
      ? `Superseded · v${payload.negotiation.version}`
      : awaitingPayment
        ? "Ready for Payment"
        : payload.projectRequest.status === "rejected"
          ? "Declined"
          : isAcceptedTerms && payload.projectRequest.status === "accepted"
            ? "Accepted"
            : `Version ${payload.negotiation.version} · ${payload.negotiation.status}`;

  return (
    <div
      className={`my-2 w-full min-w-[300px] max-w-xl overflow-hidden rounded-2xl border bg-white text-slate-900 shadow-sm ${
        locked ? "border-emerald-200 opacity-95" : "border-slate-200"
      }`}
    >
      <div className={`border-b px-5 py-4 ${locked ? "bg-emerald-50" : "bg-slate-50"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Proposal</p>
            <h4 className="mt-1 text-base font-black leading-snug">{snapshot.title}</h4>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
              locked
                ? "bg-emerald-600 text-white"
                : awaitingPayment
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700"
            }`}
          >
            {statusBadge}
          </span>
        </div>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {payload.proposer.full_name || "Participant"} ·{" "}
          {new Date(payload.negotiation.created_at).toLocaleString()} ·{" "}
          {snapshot.payment_type === "milestone_payment" ? "Milestone Payment" : "Single Payment"}
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <p className="text-sm leading-relaxed text-slate-600">{snapshot.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Proposed Budget</p>
            <p className="mt-1 text-xl font-black text-slate-900">{formatMoney(payload.negotiation.proposed_amount_usd)}</p>
            {amountChanged && (
              <p className="mt-1 text-[10px] font-bold text-amber-600">
                Changed from {formatMoney(payload.previousVersion?.proposed_amount_usd)}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total with Platform Fee</p>
            <p className="mt-1 text-xl font-black text-blue-600">
              {formatMoney(Number(payload.negotiation.proposed_amount_usd ?? 0) + payload.platformFeeUsd)}
            </p>
          </div>
        </div>

        {snapshot.expected_deadline && (
          <p className="text-xs font-medium text-slate-500">
            Deadline: {new Date(snapshot.expected_deadline).toLocaleDateString()}
          </p>
        )}

        {snapshot.required_technologies && snapshot.required_technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {snapshot.required_technologies.map((tech) => (
              <span key={tech} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                {tech}
              </span>
            ))}
          </div>
        )}

        {payload.negotiation.proposed_milestones.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Milestones</p>
            {payload.negotiation.proposed_milestones.map((milestone, index) => (
              <div key={`${milestone.title}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-900">{milestone.title}</p>
                  <p className="text-sm font-black text-blue-600">{formatMoney(milestone.amount)}</p>
                </div>
                {milestone.description && <p className="mt-1 text-xs text-slate-500">{milestone.description}</p>}
              </div>
            ))}
          </div>
        )}

        {snapshot.attachment_urls && snapshot.attachment_urls.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Attachments</p>
            <div className="space-y-1">
              {snapshot.attachment_urls.map((file, index) => (
                <a
                  key={`${file.url}-${index}`}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs font-bold text-blue-600 hover:underline"
                >
                  {file.name || `Attachment ${index + 1}`}
                </a>
              ))}
            </div>
          </div>
        )}

        {payload.negotiation.explanation && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Negotiation Note</p>
            <p className="mt-1 text-sm text-amber-900">{payload.negotiation.explanation}</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        {showNegotiate && canAct && (
          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Revise Proposal</p>
            <input
              type="number"
              min="1"
              value={proposedAmount}
              onChange={(event) => setProposedAmount(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="Proposed amount (USD)"
            />
            <textarea
              rows={3}
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Explain your changes..."
            />
            <button
              type="button"
              disabled={acting}
              onClick={() =>
                void runAction(userRole === "builder" ? "negotiate" : "counter_offer", {
                  proposed_amount_usd: Number(proposedAmount),
                  proposed_milestones: milestones,
                  explanation,
                })
              }
              className="w-full rounded-xl bg-blue-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Send Updated Proposal
            </button>
          </div>
        )}

        {canAct && (
          <div className="flex flex-wrap gap-2 pt-1">
            {awaitingPayment ? (
              <button
                type="button"
                disabled={acting}
                onClick={() => void handleProceedToPayment()}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600 disabled:opacity-60"
              >
                Proceed to Payment
              </button>
            ) : (
              <>
                {!isProposer && (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void runAction("accept")}
                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    Accept
                  </button>
                )}
                {!isProposer && userRole === "builder" && (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => setShowNegotiate((current) => !current)}
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Negotiate
                  </button>
                )}
                {!isProposer && userRole === "buyer" && (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => setShowNegotiate((current) => !current)}
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Counter Offer
                  </button>
                )}
                {!isProposer && userRole === "builder" && (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void runAction("decline")}
                    className="flex-1 rounded-xl bg-rose-50 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    Decline
                  </button>
                )}
                {!isProposer && userRole === "buyer" && (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void runAction("reject")}
                    className="flex-1 rounded-xl bg-rose-50 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    Reject
                  </button>
                )}
                <button
                  type="button"
                  onClick={onFocusComposer}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                >
                  {userRole === "builder" ? "Message Buyer" : "Message Builder"}
                </button>
              </>
            )}
          </div>
        )}

        {locked && (
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            Escrow funded · Proposal locked
          </p>
        )}

        {!canAct && !locked && isAcceptedTerms && payload.projectRequest.status === "accepted" && userRole === "builder" && (
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-blue-700">
            Awaiting buyer payment
          </p>
        )}

        {!canAct && !locked && !isAcceptedTerms && payload.negotiation.version > 1 && (
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Superseded proposal · v{payload.negotiation.version}
          </p>
        )}
      </div>
    </div>
  );
}
