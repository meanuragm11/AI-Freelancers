"use client";

import React from 'react';
import Link from 'next/link';

export default function BuilderSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Builder Settings</h1>
      <p className="text-sm font-medium text-slate-500 max-w-md mb-8">
        Your account configurations have been moved to the primary Command Center and Profile Editor for a unified experience.
      </p>
      <Link href="/builder/dashboard" className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md">
        Return to Command Center
      </Link>
    </div>
  );
}