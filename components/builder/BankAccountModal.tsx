"use client";

import React, { useEffect, useState } from "react";
import type { PayoutMethodSummary } from "@/lib/builder/earningsLedger";

type PayoutFormState = {
  payoutRegion: "india" | "international";
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  ifscCode: string;
  paypalEmail: string;
};

type BankAccountModalProps = {
  open: boolean;
  existingMethod?: PayoutMethodSummary;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (form: PayoutFormState) => Promise<void>;
};

const EMPTY_FORM: PayoutFormState = {
  payoutRegion: "india",
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  routingNumber: "",
  ifscCode: "",
  paypalEmail: "",
};

export default function BankAccountModal({
  open,
  existingMethod,
  submitting,
  onClose,
  onSubmit,
}: BankAccountModalProps) {
  const [form, setForm] = useState<PayoutFormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;

    setForm({
      payoutRegion: existingMethod?.payoutRegion ?? "india",
      accountHolderName: existingMethod?.accountHolderName ?? "",
      bankName: existingMethod?.bankName ?? "",
      accountNumber: "",
      routingNumber: "",
      ifscCode: existingMethod?.ifscCode ?? "",
      paypalEmail: existingMethod?.paypalEmail ?? "",
    });
  }, [open, existingMethod]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const isUpdate = existingMethod?.connected === true;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:items-center md:p-6"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="flex max-h-[96vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {isUpdate ? "Update Payout Method" : "Connect Payout Method"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {isUpdate ? "Update Bank Account" : "Connect Bank Account"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Securely link your bank details to withdraw cleared earnings.
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
          {isUpdate && existingMethod?.accountLast4 && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
              Current account ending in ****{existingMethod.accountLast4}. Enter new details below to replace it.
            </div>
          )}

          <div className="space-y-3">
            <select
              value={form.payoutRegion}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  payoutRegion: event.target.value as "india" | "international",
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="india">India (Bank Transfer)</option>
              <option value="international">International (Bank / PayPal)</option>
            </select>
            <input
              required
              placeholder="Account holder name"
              value={form.accountHolderName}
              onChange={(event) => setForm((current) => ({ ...current, accountHolderName: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            />
            <input
              placeholder="Bank name (optional)"
              value={form.bankName}
              onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            />
            <input
              required
              placeholder={isUpdate ? "New account number" : "Account number"}
              value={form.accountNumber}
              onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            />
            {form.payoutRegion === "india" ? (
              <input
                required
                placeholder="IFSC code"
                value={form.ifscCode}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ifscCode: event.target.value.toUpperCase() }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
              />
            ) : (
              <>
                <input
                  placeholder="Routing number (optional)"
                  value={form.routingNumber}
                  onChange={(event) => setForm((current) => ({ ...current, routingNumber: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                />
                <input
                  placeholder="PayPal email (optional)"
                  type="email"
                  value={form.paypalEmail}
                  onChange={(event) => setForm((current) => ({ ...current, paypalEmail: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                />
              </>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : isUpdate ? "Save Changes" : "Save Bank Account"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
