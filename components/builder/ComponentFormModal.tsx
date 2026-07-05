"use client";

import React, { useEffect, useState } from "react";
import ComponentPublishForm from "@/components/builder/ComponentPublishForm";
import {
  componentToFormState,
  type ComponentFormInitialData,
  type ComponentRecord,
} from "@/lib/components/form";

type ComponentFormModalProps = {
  builderId: string;
  open: boolean;
  editingComponent: ComponentRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ComponentFormModal({
  builderId,
  open,
  editingComponent,
  onClose,
  onSaved,
}: ComponentFormModalProps) {
  const [initialData, setInitialData] = useState<ComponentFormInitialData | undefined>();

  useEffect(() => {
    if (!open || !editingComponent) {
      setInitialData(undefined);
      return;
    }
    setInitialData(componentToFormState(editingComponent));
  }, [open, editingComponent]);

  if (!open || !editingComponent || !initialData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-slate-50 shadow-2xl md:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Edit Component
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{editingComponent.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update every publishing field — metadata, fulfillment payload, and pricing.
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

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ComponentPublishForm
            key={editingComponent.id}
            builderId={builderId}
            mode="edit"
            componentId={editingComponent.id}
            initialData={initialData}
            variant="embedded"
            onSuccess={() => {
              onSaved();
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
