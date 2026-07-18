"use client";

import React, { useState } from "react";
import { createProjectRequestWithConversation } from "@/lib/project-requests";
import { uploadMarketplaceFile } from "@/lib/storage/upload";

export interface CustomProjectModalProps {
  builderId: string;
  serviceId?: string | null;
  builderName?: string;
  onClose: () => void;
  onSuccess?: (conversationId: string) => void;
}

export default function CustomProjectModal({
  builderId,
  serviceId,
  builderName,
  onClose,
  onSuccess,
}: CustomProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState<number | "">("");
  const [deadline, setDeadline] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [technologies, setTechnologies] = useState("");
  const [priority, setPriority] = useState("normal");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentType, setPaymentType] = useState<"single_payment" | "milestone_payment">("single_payment");
  const [milestones, setMilestones] = useState<Array<{ title: string; description: string; amount: number; deadline: string }>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Title and description are required.");
      return;
    }
    if (paymentType === "milestone_payment" && milestones.length === 0) {
      alert("At least one milestone is required for milestone payment.");
      return;
    }
    if (paymentType === "single_payment" && !budget) {
      alert("Budget is required for single payment.");
      return;
    }

    setSubmitting(true);
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }

      const attachmentUrls: { type: string; url: string; name: string }[] = [];
      for (const file of files) {
        try {
          const url = await uploadMarketplaceFile(user.id, "project-requests", file);
          attachmentUrls.push({ type: file.type, url, name: file.name });
        } catch (fileError) {
          console.error("Failed to upload file:", file.name, fileError);
          // Continue with other files even if one fails
        }
      }

      const links = referenceLinks
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const techs = technologies
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { conversationId } = await createProjectRequestWithConversation({
        buyer_id: user.id,
        builder_id: builderId,
        service_id: serviceId,
        title: title.trim(),
        description: description.trim(),
        budget_usd: paymentType === "single_payment" ? (budget !== "" ? Number(budget) : null) : milestones.reduce((sum, m) => sum + m.amount, 0),
        expected_deadline: deadline || null,
        reference_links: links,
        required_technologies: techs,
        attachment_urls: attachmentUrls,
        priority,
        additional_notes: additionalNotes.trim() || null,
        payment_type: paymentType,
        proposed_milestones: paymentType === "milestone_payment" ? milestones : undefined,
      });

      onSuccess?.(conversationId);
      onClose();
    } catch (err: unknown) {
      console.error("Custom project request submission error:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      let message = "Failed to submit request";
      if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === 'object') {
        message = JSON.stringify(err);
      }
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-in fade-in">
      <div className="modal-panel bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[96dvh]">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900">Request Custom Project</h3>
            {builderName && (
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                To {builderName}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Payment Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType("single_payment")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentType === "single_payment"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-black text-slate-900 mb-1">Single Payment</div>
                <div className="text-[10px] font-medium text-slate-500">Pay once upon agreement</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("milestone_payment")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentType === "milestone_payment"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-black text-slate-900 mb-1">Milestone Payment</div>
                <div className="text-[10px] font-medium text-slate-500">Pay in stages</div>
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Project Title *
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="e.g. Custom RAG chatbot for support"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none focus:border-blue-500"
              placeholder="Describe scope, goals, and deliverables..."
            />
          </div>

          {paymentType === "single_payment" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Budget (USD) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={budget}
                  onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Expected Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Milestones *
                </label>
                <button
                  type="button"
                  onClick={() => setMilestones([...milestones, { title: "", description: "", amount: 0, deadline: "" }])}
                  className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800"
                >
                  + Add Milestone
                </button>
              </div>
              <div className="space-y-3">
                {milestones.map((milestone, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <input
                        type="text"
                        placeholder="Milestone title"
                        value={milestone.title}
                        onChange={(e) => {
                          const updated = [...milestones];
                          updated[index].title = e.target.value;
                          setMilestones(updated);
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setMilestones(milestones.filter((_, i) => i !== index))}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      placeholder="Description"
                      rows={2}
                      value={milestone.description}
                      onChange={(e) => {
                        const updated = [...milestones];
                        updated[index].description = e.target.value;
                        setMilestones(updated);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none resize-none focus:border-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Amount (USD)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={milestone.amount || ""}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[index].amount = Number(e.target.value) || 0;
                            setMilestones(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Deadline</label>
                        <input
                          type="date"
                          value={milestone.deadline}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[index].deadline = e.target.value;
                            setMilestones(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {milestones.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-700">Total Milestone Budget</span>
                    <span className="font-black text-slate-900">${milestones.reduce((sum, m) => sum + m.amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="font-bold text-slate-700">Platform Fee</span>
                    <span className="font-black text-slate-900">+$5</span>
                  </div>
                  <div className="flex justify-between items-center text-base mt-2 pt-2 border-t border-blue-200">
                    <span className="font-black text-slate-900">Final Amount</span>
                    <span className="font-black text-blue-600">${(milestones.reduce((sum, m) => sum + m.amount, 0) + 5).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Reference Links (one per line)
            </label>
            <textarea
              rows={2}
              value={referenceLinks}
              onChange={(e) => setReferenceLinks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Required Technologies (comma-separated)
            </label>
            <input
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="LangChain, Python, OpenAI API"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Upload Files
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="w-full text-sm text-slate-600"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 disabled:bg-slate-300 text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
          >
            {submitting ? "Submitting..." : `Submit ${paymentType === "single_payment" ? "Single Payment" : "Milestone Payment"} Request`}
          </button>
        </form>
      </div>
    </div>
  );
}
