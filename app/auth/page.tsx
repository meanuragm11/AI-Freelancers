"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [role, setRole] = useState<'buyer' | 'builder'>('buyer');
  const [verificationSent, setVerificationSent] = useState(false);

  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });

  useEffect(() => {
    const urlRole = searchParams.get('role');
    if (urlRole === 'builder' || urlRole === 'buyer') setRole(urlRole);

    const error = searchParams.get('error');
    if (error === 'email_exists') {
      alert('This email is already registered with a password. Please login with your password instead of using Google.');
    }
  }, [searchParams]);

  // --- SESSION CHECK ON MOUNT ---
  // This properly handles the code that was crashing your build.
  // It securely checks if the user is already logged in when they hit this page.
  useEffect(() => {
    async function checkExistingSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_freelancer')
          .eq('id', user.id)
          .single();

        if (profile?.is_freelancer) {
          router.push('/builder/dashboard');
        } else {
          router.push('/buyer/dashboard');
        }
      }
    }
    checkExistingSession();
  }, [router]);

  // --- GOOGLE SINGLE SIGN-ON ---
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      // Check if user is already logged in (to link identities)
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // User is already logged in, link Google identity to existing account
        const { error: linkError } = await supabase.auth.linkIdentity({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (linkError) throw linkError;
      } else {
        // User not logged in, check if email already exists with email/password
        // We can't check email before OAuth, so we'll handle this in the callback
        // Proceed with normal Google sign-in
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) throw error;
      }
    } catch (error: any) {
      alert("Google Auth Error: " + error.message);
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = formData.email.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Enter a valid email address.');
      }

      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });
        
        if (error) {
          if (error.message.includes("Email not confirmed")) throw new Error("Please verify your email inbox first.");
          throw error;
        }

        // Dynamically route based on actual DB profile
        if (authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_freelancer')
            .eq('id', authData.user.id)
            .single();

          if (profile?.is_freelancer) {
            router.push('/builder/dashboard');
          } else {
            router.push('/buyer/discover');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: { full_name: formData.fullName, role: role },
            emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}`
          }
        });

        if (error) throw error;

        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').upsert([
            { id: data.user.id, full_name: formData.fullName, role: role, is_freelancer: role === 'builder' }
          ]);
          if (profileError) console.error('Profile sync error:', profileError.message);
        }
        setVerificationSent(true);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-10 shadow-xl text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Verify Your Identity</h2>
          <p className="text-sm font-medium text-slate-500 mb-8">
            We have sent a secure link to <span className="font-bold text-slate-900">{formData.email}</span>.
          </p>
          <button onClick={() => window.location.reload()} className="text-sm font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors">
            I have verified my email → Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative z-10">
        <Link href="/" className="text-2xl font-black tracking-tight text-slate-900 flex justify-center mb-8">
          Zelance<span className="text-blue-600">.</span>
        </Link>

        {!isLogin && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button type="button" onClick={() => setRole('buyer')} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${role === 'buyer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Enterprise Buyer</button>
            <button type="button" onClick={() => setRole('builder')} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${role === 'builder' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>AI Builder</button>
          </div>
        )}

        {/* --- GOOGLE BUTTON --- */}
        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {googleLoading ? 'Connecting to Google...' : `Continue with Google`}
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or Email</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          {!isLogin && (
            <div>
              <input required type="text" placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" />
            </div>
          )}
          <div>
            <input required type="email" placeholder="you@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" />
          </div>
          <div>
            <input required type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" />
          </div>

          <button type="submit" disabled={loading} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50">
            {loading ? 'Authenticating...' : (isLogin ? 'Secure Login' : 'Create Account')}
          </button>
        </form>

        <p className="text-center text-sm font-medium text-slate-500 mt-8">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold hover:underline">
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Gateway...</div>}>
      <AuthContent />
    </Suspense>
  );
}