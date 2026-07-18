"use client";

import React, { useState } from "react";

export interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  onSubmit: (proposal: any) => void;
}

export default function NegotiationModal({
  isOpen,
  onClose,
  request,
  onSubmit,
}: NegotiationModalProps) {
  const [proposedPrice, setProposedPrice] = useState<number>(request.budget_usd || 0);
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedPrice || proposedPrice <= 0) {
      alert("Please enter a valid proposed price");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        project_request_id: request.id,
        proposed_amount_usd: proposedPrice,
        explanation: explanation.trim() || null,
        proposal_type: "counter_offer",
      });
      onClose();
    } catch (error) {
      console.error("Error submitting proposal:", error);
      alert("Failed to submit proposal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-in fade-in">
      <div className="modal-panel bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900">Negotiate Price</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              {request.title}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-slate-700">Original Request</span>
              <span className="text-sm font-black text-slate-900">${request.budget_usd?.toLocaleString() || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Your Proposal</span>
              <span className="text-lg font-black text-blue-600">${proposedPrice.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Proposed Price (USD) *
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={proposedPrice || ""}
              onChange={(e) => setProposedPrice(Number(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="Enter your proposed price"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Explanation (Optional)
            </label>
            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none focus:border-blue-500"
              placeholder="Explain why you're proposing this price..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              {submitting ? "Submitting..." : "Send Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
