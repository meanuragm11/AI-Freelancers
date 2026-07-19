"use client";

import { Suspense } from "react";
import { ForgotPasswordExperience } from "@/components/auth/ForgotPasswordExperience";

function ForgotPasswordLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950">
      <p className="text-sm font-medium text-slate-400">Loading…</p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordLoading />}>
      <ForgotPasswordExperience />
    </Suspense>
  );
}
