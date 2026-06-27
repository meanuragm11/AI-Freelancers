"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Securing connection...");

  useEffect(() => {
    const handleInstantRouting = async () => {
      // 1. Grab the session immediately on mount
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const role = searchParams.get('role') || 'buyer';
        const fullName = session.user.user_metadata?.full_name || 'Zelance User';

        // 2. FIRE AND FORGET: Create the database profile in the background
        // We do NOT await this. We don't want the user waiting on a database write.
        supabase.from('profiles').insert([
          { id: session.user.id, full_name: fullName, role: role }
        ]).then(() => console.log("Profile sync complete."));

        // 3. INSTANT REDIRECT to the main screen
        router.push(role === 'builder' ? '/builder/dashboard' : '/buyer/discover');
      }
    };

    handleInstantRouting();

    // Fallback: Listen for the exact moment the URL hash is processed by Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const role = searchParams.get('role') || 'buyer';
        router.push(role === 'builder' ? '/builder/dashboard' : '/buyer/discover');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight">{status}</h2>
    </div>
  );
}