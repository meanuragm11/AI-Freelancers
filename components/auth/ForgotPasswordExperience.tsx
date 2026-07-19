"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import Image from "@/components/RemoteImage";
import { supabase } from "@/lib/supabaseClient";
import { getAppUrl } from "@/lib/urls/appUrl";
import {
  AuthAlert,
  FieldError,
  FieldLabel,
  Spinner,
  authInputClass,
  authInputErrorClass,
  authInputOkClass,
} from "@/components/auth/authFormUi";

export function ForgotPasswordExperience() {
  const formId = useId();
  const emailId = `${formId}-email`;
  const emailErrorId = `${formId}-email-error`;

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (): boolean => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Please enter your email address.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address.");
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateEmail()) return;

    setLoading(true);

    try {
      const redirectTo = `${getAppUrl()}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) throw error;
      setEmailSent(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to send reset email. Please try again.";
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.35),transparent)]"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 text-center shadow-2xl shadow-blue-950/20 backdrop-blur-sm sm:p-10">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
            ✉️
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Check your inbox</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            If an account exists for{" "}
            <span className="font-medium text-slate-900">{email.trim()}</span>, we sent a password
            reset link. The link expires after a short time.
          </p>
          <Link
            href="/auth"
            className="mt-8 inline-block text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
          >
            Back to sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col lg:flex-row">
      <div className="relative overflow-hidden bg-slate-950 px-6 py-10 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:px-12 lg:py-14 xl:w-[42%]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_20%_0%,rgba(37,99,235,0.45),transparent_55%)]"
          aria-hidden="true"
        />

        <div className="relative">
          <Link
            href="/"
            className="inline-flex items-baseline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
          >
            <Image src="/logo.svg" alt="Zelance Logo" width={140} height={40} priority className="h-8 w-auto object-contain" />
          </Link>
        </div>

        <div className="relative mt-10 lg:mt-0 lg:flex-1 lg:flex lg:flex-col lg:justify-center lg:py-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-300/80">Account recovery</p>
          <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Reset your password
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Enter the email linked to your Zelance account and we&apos;ll send a secure reset link.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <Link
              href="/"
              className="inline-flex items-baseline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              <Image src="/logo.svg" alt="Zelance Logo" width={140} height={40} priority className="h-8 w-auto object-contain" />
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Forgot password?</h2>
            <p className="mt-2 text-sm text-slate-500">
              We&apos;ll email you a link to choose a new password.
            </p>
          </div>

          {formError && (
            <div className="mb-4">
              <AuthAlert message={formError} tone="error" />
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <FieldLabel htmlFor={emailId}>Email Address</FieldLabel>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(undefined);
                }}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? emailErrorId : undefined}
                className={`${authInputClass} ${emailError ? authInputErrorClass : authInputOkClass}`}
                placeholder="you@example.com"
              />
              <FieldError id={emailErrorId} message={emailError} />
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 text-white" />
                  <span>Sending reset link…</span>
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Remember your password?{" "}
            <Link
              href="/auth"
              className="font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
