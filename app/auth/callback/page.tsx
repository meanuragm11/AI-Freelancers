"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isStaleAuthSessionError } from "@/lib/auth/errors";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

const UNIFIED_ROLE = "buyer" as const;

async function syncProfile(userId: string, fullName: string) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, role, is_freelancer")
    .eq("id", userId)
    .maybeSingle();

  const isFreelancer = existingProfile?.is_freelancer === true;
  const profileRole = isFreelancer
    ? existingProfile?.role ?? "builder"
    : UNIFIED_ROLE;

  const { error } = await supabase.from("profiles").upsert([
    {
      id: userId,
      full_name: fullName,
      role: profileRole,
      is_freelancer: isFreelancer,
    },
  ]);

  if (error) {
    console.error("Profile sync error:", error.message);
  }
}

async function routeAfterAuth(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_freelancer")
    .eq("id", userId)
    .maybeSingle();

  return profile?.is_freelancer ? "/builder/dashboard" : "/buyer/discover";
}

function AuthCallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState("Securing your connection…");

  useEffect(() => {
    let redirected = false;

    const redirectToApp = async (userId: string, fullName: string) => {
      if (redirected) return;
      redirected = true;

      await syncProfile(userId, fullName);
      const destination = await routeAfterAuth(userId);
      setStatus("Verification successful! Redirecting…");
      router.replace(destination);
    };

    const handleAuthFailure = async (message: string) => {
      if (redirected) return;
      redirected = true;

      console.error("Auth callback error:", message);
      await supabase.auth.signOut();
      setStatus("Authentication failed. Redirecting…");
      setTimeout(() => router.replace("/auth"), 1500);
    };

    const completeSignIn = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        await handleAuthFailure(error.message);
        return;
      }

      if (isStaleAuthSessionError(error) || !user) {
        await handleAuthFailure("Authentication failed.");
        return;
      }

      const fullName = user.user_metadata?.full_name || "Zelance User";
      await redirectToApp(user.id, fullName);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const fullName = session.user.user_metadata?.full_name || "Zelance User";
        await redirectToApp(session.user.id, fullName);
      }
    });

    completeSignIn();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.25),transparent)]"
        aria-hidden="true"
      />
      <div
        className="relative mb-5 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-blue-400"
        role="status"
        aria-label="Loading"
      />
      <h2 className="relative text-lg font-medium tracking-tight text-white">{status}</h2>
    </div>
  );
}

function CallbackLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950">
      <p className="text-sm font-medium text-slate-400">Authenticating…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
