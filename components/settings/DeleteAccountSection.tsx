"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SettingsAlert from "@/components/buyer/settings/SettingsAlert";

type DeleteAccountSectionProps = {
  description?: string;
};

export default function DeleteAccountSection({
  description = "Permanently delete your account and associated data. This action cannot be undone.",
}: DeleteAccountSectionProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const canDelete = deleteConfirmation === "DELETE";

  const closeModal = () => {
    setShowModal(false);
    setDeleteConfirmation("");
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canDelete) {
      setMessage({ text: "Type DELETE to confirm account removal.", type: "error" });
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/delete", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ||
            "Your account cannot be deleted while active projects, disputes, or escrow obligations exist."
        );
      }

      await supabase.auth.signOut();
      router.push("/");
    } catch (error: unknown) {
      setMessage({
        text: error instanceof Error ? error.message : "Failed to delete account.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 shadow-sm">
        <h2 className="text-lg font-black text-rose-900 mb-2">Danger Zone</h2>
        {message && !showModal && <SettingsAlert message={message.text} type={message.type} />}
        <p className="text-xs font-medium text-rose-700 mb-6">{description}</p>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setShowModal(true);
          }}
          className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors"
        >
          Delete Account
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <h3 className="text-lg font-black text-rose-900 mb-2">Delete Account</h3>
            <p className="text-sm text-rose-700 font-medium mb-6">
              This permanently removes your account and associated data. Active projects, disputes,
              or escrow obligations will block deletion. Type DELETE to confirm.
            </p>
            {message && showModal && <SettingsAlert message={message.text} type={message.type} />}
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Confirmation
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || !canDelete}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
