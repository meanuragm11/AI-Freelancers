"use client";

import React from 'react';
import DisputeCenter from '@/components/DisputeCenter';

interface DisputeModalProps {
  collabId: string;
  currentUser: { id: string };
  userRole: 'buyer' | 'builder';
  onClose: () => void;
  onDisputeChanged?: (isActive: boolean) => void;
  title?: string;
  subtitle?: string;
  showOpenDisputeForm?: boolean;
}

export default function DisputeModal({
  collabId,
  currentUser,
  userRole,
  onClose,
  onDisputeChanged,
  title = 'Raise Dispute',
  subtitle = 'Escrow will be frozen while the dispute is active.',
  showOpenDisputeForm = true,
}: DisputeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <DisputeCenter
            collabId={collabId}
            currentUser={currentUser}
            userRole={userRole}
            onDisputeChanged={onDisputeChanged}
            showOpenDisputeForm={showOpenDisputeForm}
            variant="embedded"
            onDisputeOpened={onClose}
          />
        </div>
      </div>
    </div>
  );
}
