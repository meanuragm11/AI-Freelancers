"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

const UNIFIED_ROLE = "buyer" as const;

async function syncProfile(userId: string, fullName: string) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, role, is_freelancer")
    .eq("id", userId)
    .maybeSingle();

  // Preserve an existing builder profile; new unified signups default to buyer.
  const profileRole = existingProfile?.role || UNIFIED_ROLE;
  const isFreelancer =
    existingProfile?.is_freelancer ?? profileRole === "builder";

  await supabase.from("profiles").upsert([
    {
      id: userId,
      full_name: fullName,
      role: profileRole,
      is_freelancer: isFreelancer,
    },
  ]);
}

function AuthCallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState("Securing your connection…");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setStatus("Authentication failed. Redirecting…");
          setTimeout(() => router.push("/auth"), 2000);
          return;
        }

        if (session) {
          const fullName = session.user.user_metadata?.full_name || "Zelance User";
          await syncProfile(session.user.id, fullName);

          setStatus("Verification successful! Redirecting…");
          setTimeout(() => router.push("/"), 1000);
        } else {
          setStatus("Completing verification…");
        }
      } catch (err) {
        console.error("Callback error:", err);
        setStatus("Something went wrong. Redirecting to login…");
        setTimeout(() => router.push("/auth"), 2000);
      }
    };

    handleCallback();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const fullName = session.user.user_metadata?.full_name || "Zelance User";
        await syncProfile(session.user.id, fullName);

        setStatus("Verification successful! Redirecting…");
        setTimeout(() => router.push("/"), 1000);
      }
    });

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
