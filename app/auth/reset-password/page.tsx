"use client";

import { Suspense } from "react";
import { ResetPasswordExperience } from "@/components/auth/ResetPasswordExperience";

function ResetPasswordLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950">
      <p className="text-sm font-medium text-slate-400">Loading…</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordExperience />
    </Suspense>
  );
}
