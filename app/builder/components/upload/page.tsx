"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ComponentPublishForm from "@/components/builder/ComponentPublishForm";

export default function UploadComponent() {
  const router = useRouter();
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      setBuilderId(user.id);
      setLoadingAuth(false);
    }

    void loadUser();
  }, [router]);

  if (loadingAuth || !builderId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-4">
            Zelance Component Exchange
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Deploy an Asset</h1>
          <p className="text-slate-500 font-medium text-lg">
            Monetize your AI architectures, prompts, and models directly to enterprise buyers.
          </p>
        </div>

        <ComponentPublishForm
          builderId={builderId}
          mode="create"
          variant="page"
          onSuccess={() => {
            setTimeout(() => {
              router.push("/builder/arena");
            }, 2000);
          }}
        />
      </div>
    </div>
  );
}
