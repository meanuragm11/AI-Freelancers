"use client";

import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/AuthExperience";

function AuthLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthExperience />
    </Suspense>
  );
}
