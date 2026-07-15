"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { supabase } from "@/lib/supabaseClient";
import { clearStaleAuthSession, isStaleAuthSessionError } from "@/lib/auth/session";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const UNIFIED_ROLE = "buyer" as const;
const CALLBACK_URL = "/auth/callback";

type FormData = {
  fullName: string;
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof FormData | "form", string>>;

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-slate-700"
    >
      {children}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-600">
      {message}
    </p>
  );
}

export function AuthExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();

  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
  });

  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const fullNameId = `${formId}-full-name`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const fullNameErrorId = `${formId}-full-name-error`;
  const emailErrorId = `${formId}-email-error`;
  const passwordErrorId = `${formId}-password-error`;
  const formErrorId = `${formId}-form-error`;

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "email_exists") {
      setFormError(
        "This email is already registered with a password. Please log in with your password instead of Google."
      );
    }
  }, [searchParams]);

  useEffect(() => {
    async function checkExistingSession() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (isStaleAuthSessionError(error)) {
        await supabase.auth.signOut();
        return;
      }

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_freelancer")
          .eq("id", user.id)
          .single();

        if (profile?.is_freelancer) {
          router.push("/builder/dashboard");
        } else {
          router.push("/buyer/dashboard");
        }
      }
    }
    checkExistingSession();
  }, [router]);

  useEffect(() => {
    setFieldErrors({});
    setFormError(null);
    setShowPassword(false);

    const timer = window.setTimeout(() => {
      if (isLogin) {
        emailRef.current?.focus();
      } else {
        fullNameRef.current?.focus();
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [isLogin]);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const email = formData.email.trim();

    if (!isLogin) {
      if (!formData.fullName.trim()) {
        errors.fullName = "Please enter your full name.";
      } else if (formData.fullName.trim().length < 2) {
        errors.fullName = "Name must be at least 2 characters.";
      }
    }

    if (!email) {
      errors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }

    if (!formData.password) {
      errors.password = "Please enter your password.";
    } else if (!isLogin && formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const routeAfterLogin = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_freelancer")
      .eq("id", userId)
      .single();

    if (profile?.is_freelancer) {
      router.push("/builder/dashboard");
    } else {
      router.push("/buyer/discover");
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setFormError(null);

    try {
      // getSession() reads local storage only; stale JWTs from deleted users
      // caused linkIdentity to run and fail with "sub claim does not exist".
      await clearStaleAuthSession();

      const redirectTo = `${window.location.origin}${CALLBACK_URL}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google sign-in failed.";
      setFormError(message);
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const email = formData.email.trim();

      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes("Email not confirmed")) {
            throw new Error("Please verify your email inbox first.");
          }
          throw error;
        }

        if (authData.user) {
          await routeAfterLogin(authData.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName.trim(),
              role: UNIFIED_ROLE,
            },
            emailRedirectTo: `${window.location.origin}${CALLBACK_URL}`,
          },
        });

        if (error) throw error;

        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert([
            {
              id: data.user.id,
              full_name: formData.fullName.trim(),
              role: UNIFIED_ROLE,
              is_freelancer: false,
            },
          ]);
          if (profileError) console.error("Profile sync error:", profileError.message);
        }
        setVerificationSent(true);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
  };

  if (verificationSent) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.35),transparent)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 text-center shadow-2xl shadow-blue-950/20 backdrop-blur-sm sm:p-10"
          role="status"
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
            ✉️
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Check your inbox
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            We sent a verification link to{" "}
            <span className="font-medium text-slate-900">{formData.email}</span>.
            Click the link to activate your account.
          </p>
          <button
            type="button"
            onClick={() => {
              setVerificationSent(false);
              setIsLogin(true);
            }}
            className="mt-8 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
          >
            I&apos;ve verified — log in →
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60";
  const inputErrorClass = "border-red-300 focus:border-red-500 focus:ring-red-500/20";
  const inputOkClass = "border-slate-200";

  return (
    <div className="relative flex min-h-dvh flex-col lg:flex-row">
      {/* Hero panel */}
      <div className="relative overflow-hidden bg-slate-950 px-6 py-10 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:px-12 lg:py-14 xl:w-[42%]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_20%_0%,rgba(37,99,235,0.45),transparent_55%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl animate-[pulse_8s_ease-in-out_infinite]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]"
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-300/80">
            AI marketplace
          </p>
          <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Hire experts. Build your AI business.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            One account for everything on Zelance — discover talent or
            publish services when you&apos;re ready.
          </p>

          <ul className="mt-8 hidden space-y-3 text-sm text-slate-400 lg:block">
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-300">
                ✓
              </span>
              Trusted payments &amp; escrow
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-300">
                ✓
              </span>
              Verified AI experts &amp; assets
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-300">
                ✓
              </span>
              Hire AI experts or publish your AI services
            </li>
          </ul>
        </div>

        <p className="relative mt-8 hidden text-xs text-slate-500 lg:block">
          © {new Date().getFullYear()} Zelance. All rights reserved.
        </p>
      </div>

      {/* Auth card */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-[420px]">
          <div
            key={isLogin ? "login" : "signup"}
            className="animate-auth-fade-in"
          >
            <div className="mb-8 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-baseline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                <Image src="/logo.svg" alt="Zelance Logo" width={140} height={40} priority className="h-8 w-auto object-contain" />
              </Link>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                {isLogin ? "Welcome back" : "Welcome to Zelance"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {isLogin
                  ? "Continue where you left off."
                  : "Create your account and start hiring AI experts or building your AI business."}
              </p>
            </div>

            {/* Google — primary */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading || loading}
              aria-busy={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading ? (
                <>
                  <Spinner />
                  <span>Connecting to Google…</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              <span className="text-xs font-medium text-slate-400">or continue with email</span>
              <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>

            {formError && (
              <div
                id={formErrorId}
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <form
              onSubmit={handleEmailAuth}
              noValidate
              aria-describedby={formError ? formErrorId : undefined}
              className="space-y-4"
            >
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isLogin
                    ? "grid-rows-[0fr] opacity-0"
                    : "grid-rows-[1fr] opacity-100"
                }`}
                aria-hidden={isLogin}
              >
                <div className="overflow-hidden">
                  <FieldLabel htmlFor={fullNameId}>Full Name</FieldLabel>
                  <input
                    ref={fullNameRef}
                    id={fullNameId}
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    tabIndex={isLogin ? -1 : 0}
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (fieldErrors.fullName) {
                        setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    aria-invalid={!!fieldErrors.fullName}
                    aria-describedby={fieldErrors.fullName ? fullNameErrorId : undefined}
                    className={`${inputClass} ${fieldErrors.fullName ? inputErrorClass : inputOkClass}`}
                    placeholder="Jane Smith"
                  />
                  <FieldError id={fullNameErrorId} message={fieldErrors.fullName} />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor={emailId}>Email Address</FieldLabel>
                <input
                  ref={emailRef}
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? emailErrorId : undefined}
                  className={`${inputClass} ${fieldErrors.email ? inputErrorClass : inputOkClass}`}
                  placeholder="you@example.com"
                />
                <FieldError id={emailErrorId} message={fieldErrors.email} />
              </div>

              <div>
                <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
                <div className="relative">
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
                    className={`${inputClass} pr-12 ${fieldErrors.password ? inputErrorClass : inputOkClass}`}
                    placeholder={isLogin ? "Your password" : "At least 8 characters"}
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
                <FieldError id={passwordErrorId} message={fieldErrors.password} />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                aria-busy={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4 text-white" />
                    <span>{isLogin ? "Signing in…" : "Creating account…"}</span>
                  </>
                ) : isLogin ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                disabled={loading || googleLoading}
                className="font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded disabled:opacity-60"
              >
                {isLogin ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
