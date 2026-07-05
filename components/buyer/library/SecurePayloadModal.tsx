"use client";

import React from "react";

type SecurePayloadModalProps = {
  title: string;
  payload: string;
  onClose: () => void;
};

export default function SecurePayloadModal({ title, payload, onClose }: SecurePayloadModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Authorized secure payload
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <pre className="max-h-[60vh] overflow-auto rounded-2xl bg-slate-950 p-5 text-sm font-medium text-amber-300 whitespace-pre-wrap">
            {payload}
          </pre>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(payload)}
            className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600"
          >
            Copy Payload
          </button>
        </div>
      </div>
    </div>
  );
}
