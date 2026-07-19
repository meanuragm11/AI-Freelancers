"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import Image from "@/components/RemoteImage";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import {
  AuthAlert,
  FieldError,
  FieldLabel,
  Spinner,
  authInputClass,
  authInputErrorClass,
  authInputOkClass,
} from "@/components/auth/authFormUi";

export function ResetPasswordExperience() {
  const router = useRouter();
  const formId = useId();

  const passwordId = `${formId}-password`;
  const confirmPasswordId = `${formId}-confirm-password`;
  const passwordErrorId = `${formId}-password-error`;
  const confirmPasswordErrorId = `${formId}-confirm-password-error`;

  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let resolved = false;

    const markReady = () => {
      if (!cancelled && !resolved) {
        resolved = true;
        setCanReset(true);
        setPageError(null);
        setCheckingSession(false);
      }
    };

    const markInvalid = () => {
      if (!cancelled && !resolved) {
        resolved = true;
        setCanReset(false);
        setPageError("This reset link is invalid or has expired. Request a new one.");
        setCheckingSession(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        markReady();
      }
    });

    const verifyRecoverySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        markReady();
        return;
      }

      window.setTimeout(async () => {
        if (cancelled || resolved) return;

        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession();

        if (retrySession) {
          markReady();
          return;
        }

        markInvalid();
      }, 1500);
    };

    void verifyRecoverySession();

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const validateForm = (): boolean => {
    let valid = true;
    let nextPasswordError: string | undefined;
    let nextConfirmPasswordError: string | undefined;

    if (!password) {
      nextPasswordError = "Please enter a new password.";
      valid = false;
    } else if (password.length < 8) {
      nextPasswordError = "Password must be at least 8 characters.";
      valid = false;
    }

    if (!confirmPassword) {
      nextConfirmPasswordError = "Please confirm your new password.";
      valid = false;
    } else if (confirmPassword !== password) {
      nextConfirmPasswordError = "Passwords do not match.";
      valid = false;
    }

    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      router.replace("/auth?message=password_reset");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to update password. Please try again.";
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-blue-600" />
          <p className="text-sm text-slate-500">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  if (!canReset) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.35),transparent)]"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 text-center shadow-2xl shadow-blue-950/20 backdrop-blur-sm sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Link expired</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {pageError ?? "This reset link is invalid or has expired."}
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-8 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Request a new link
          </Link>
          <p className="mt-4">
            <Link href="/auth" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Back to sign in
            </Link>
          </p>
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-300/80">Secure recovery</p>
          <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Choose a new password
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Use at least 8 characters. You&apos;ll sign in again with your new password after saving.
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
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Set new password</h2>
            <p className="mt-2 text-sm text-slate-500">Enter and confirm your new password below.</p>
          </div>

          {formError && (
            <div className="mb-4">
              <AuthAlert message={formError} tone="error" />
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <FieldLabel htmlFor={passwordId}>New Password</FieldLabel>
              <div className="relative">
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(undefined);
                  }}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? passwordErrorId : undefined}
                  className={`${authInputClass} pr-12 ${passwordError ? authInputErrorClass : authInputOkClass}`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <FieldError id={passwordErrorId} message={passwordError} />
            </div>

            <div>
              <FieldLabel htmlFor={confirmPasswordId}>Confirm New Password</FieldLabel>
              <div className="relative">
                <input
                  id={confirmPasswordId}
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError(undefined);
                  }}
                  aria-invalid={!!confirmPasswordError}
                  aria-describedby={confirmPasswordError ? confirmPasswordErrorId : undefined}
                  className={`${authInputClass} pr-12 ${confirmPasswordError ? authInputErrorClass : authInputOkClass}`}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <FieldError id={confirmPasswordErrorId} message={confirmPasswordError} />
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
                  <span>Updating password…</span>
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
