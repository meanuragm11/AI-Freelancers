"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/RemoteImage";
import { supabase } from "@/lib/supabaseClient";
import { mapPasswordResetEmailError } from "@/lib/auth/errors";
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

const RESEND_COOLDOWN_MS = 60_000;

function cooldownStorageKey(email: string): string {
  return `password-reset-cooldown:${email.trim().toLowerCase()}`;
}

function getResendCooldownRemaining(email: string): number {
  if (typeof window === "undefined") return 0;

  const raw = sessionStorage.getItem(cooldownStorageKey(email));
  if (!raw) return 0;

  const remaining = Number(raw) - Date.now();
  return remaining > 0 ? remaining : 0;
}

function markResendCooldown(email: string): void {
  sessionStorage.setItem(
    cooldownStorageKey(email),
    String(Date.now() + RESEND_COOLDOWN_MS),
  );
}

export function ForgotPasswordExperience() {
  const formId = useId();
  const emailId = `${formId}-email`;
  const emailErrorId = `${formId}-email-error`;
  const submittingRef = useRef(false);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  const trimmedEmail = email.trim();

  const validateEmail = (): boolean => {
    if (!trimmedEmail) {
      setEmailError("Please enter your email address.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Enter a valid email address.");
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const sendResetEmail = useCallback(async (): Promise<boolean> => {
    const cooldownRemaining = getResendCooldownRemaining(trimmedEmail);
    if (cooldownRemaining > 0) {
      setFormError(
        `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before requesting another reset email.`,
      );
      return false;
    }

    const redirectTo = `${getAppUrl()}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    if (error) throw error;

    markResendCooldown(trimmedEmail);
    setResendCooldownSeconds(Math.ceil(RESEND_COOLDOWN_MS / 1000));
    return true;
  }, [trimmedEmail]);

  useEffect(() => {
    if (!emailSent || !trimmedEmail) return;

    const syncCooldown = () => {
      const remaining = getResendCooldownRemaining(trimmedEmail);
      setResendCooldownSeconds(remaining > 0 ? Math.ceil(remaining / 1000) : 0);
    };

    syncCooldown();
    const intervalId = window.setInterval(syncCooldown, 1000);
    return () => window.clearInterval(intervalId);
  }, [emailSent, trimmedEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;

    setFormError(null);
    if (!validateEmail()) return;

    submittingRef.current = true;
    setLoading(true);

    try {
      const sent = await sendResetEmail();
      if (sent) setEmailSent(true);
    } catch (error: unknown) {
      setFormError(mapPasswordResetEmailError(error));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (submittingRef.current || loading || resendCooldownSeconds > 0) return;

    setFormError(null);
    submittingRef.current = true;
    setLoading(true);

    try {
      await sendResetEmail();
    } catch (error: unknown) {
      setFormError(mapPasswordResetEmailError(error));
    } finally {
      submittingRef.current = false;
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
            <span className="font-medium text-slate-900">{trimmedEmail}</span>, we sent a password
            reset link. The link expires after a short time.
          </p>

          {formError && (
            <div className="mt-4 text-left">
              <AuthAlert message={formError} tone="error" />
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resendCooldownSeconds > 0}
            aria-busy={loading}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Spinner className="h-4 w-4 text-slate-600" />
                <span>Sending…</span>
              </>
            ) : resendCooldownSeconds > 0 ? (
              `Resend available in ${resendCooldownSeconds}s`
            ) : (
              "Resend reset email"
            )}
          </button>

          <Link
            href="/auth"
            className="mt-6 inline-block text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
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
