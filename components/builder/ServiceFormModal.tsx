"use client";

import React from "react";
import ServiceFormWizard from "@/components/builder/ServiceFormWizard";
import { EMPTY_SERVICE_FORM, type ServiceFormState } from "@/lib/services/form";
import type { Service } from "@/types/marketplace";

type ServiceFormModalProps = {
  builderId: string;
  open: boolean;
  editingService: Service | null;
  initialForm?: ServiceFormState;
  onClose: () => void;
  onSaved: () => void;
};

export type { ChipInputHandle } from "@/components/builder/ServiceFormWizard";

export default function ServiceFormModal({
  builderId,
  open,
  editingService,
  initialForm,
  onClose,
  onSaved,
}: ServiceFormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {editingService ? "Edit AI Solution" : "Create AI Solution"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {editingService ? editingService.title : "Publish AI Solution"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Publish freelance services, ready-to-use AI solutions, downloads, and more on one unified marketplace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <ServiceFormWizard
          builderId={builderId}
          editingService={editingService}
          initialForm={initialForm ?? EMPTY_SERVICE_FORM}
          active={open}
          onClose={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}
