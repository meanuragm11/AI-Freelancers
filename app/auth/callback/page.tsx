"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Securing connection...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Supabase to process the URL hash and establish session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => router.push('/auth'), 2000);
          return;
        }

        if (session) {
          const role = searchParams.get('role') || 'buyer';
          const fullName = session.user.user_metadata?.full_name || 'Zelance User';
          const userId = session.user.id;

          // Check if a profile row already exists for this auth user (created by
          // the on_auth_user_created trigger, or from an earlier email/password signup).
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', userId)
            .maybeSingle();

          // Sync profile: preserve an already-set role, otherwise use the role
          // chosen on the auth page (passed through as a query param).
          const profileRole = existingProfile?.role || role;
          await supabase.from('profiles').upsert([
            { 
              id: userId, 
              full_name: fullName, 
              role: profileRole,
              is_freelancer: profileRole === 'builder',
            }
          ]);

          setStatus('Verification successful! Redirecting to homepage...');
          setTimeout(() => router.push('/'), 1000);
        } else {
          setStatus('Completing verification...');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setStatus('Something went wrong. Redirecting to login...');
        setTimeout(() => router.push('/auth'), 2000);
      }
    };

    handleCallback();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const role = searchParams.get('role') || 'buyer';
        const fullName = session.user.user_metadata?.full_name || 'Zelance User';
        const userId = session.user.id;

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', userId)
          .maybeSingle();

        const profileRole = existingProfile?.role || role;
        await supabase.from('profiles').upsert([
          { 
            id: userId, 
            full_name: fullName, 
            role: profileRole,
            is_freelancer: profileRole === 'builder',
          }
        ]);

        setStatus('Verification successful! Redirecting to homepage...');
        setTimeout(() => router.push('/'), 1000);
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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase tracking-widest text-slate-400">Authenticating...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}