"use client";

import Link from "next/link";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";

export default function BuilderSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link
            href="/builder/dashboard"
            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Command Center
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Manage profile and security from the Command Center. Account deletion is available below.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 w-full animate-in fade-in duration-500">
        <DeleteAccountSection description="Permanently delete your builder account, active projects, listings, and payout history. This action cannot be undone." />
      </div>
    </div>
  );
}
