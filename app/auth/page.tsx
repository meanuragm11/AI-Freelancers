"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// 1. We move the main logic into a separate component
function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') || 'buyer';

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(true); 
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: ''
  });

  useEffect(() => {
    async function checkActiveSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push(role === 'builder' ? '/builder/dashboard' : '/buyer/discover');
      } else {
        setLoading(false);
      }
    }
    checkActiveSession();
  }, [router, role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Google OAuth Handler
  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) alert(error.message);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        alert(error.message);
        setLoading(false);
      } else {
        router.push(role === 'builder' ? '/builder/dashboard' : '/buyer/discover');
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: role
          }
        }
      });

      if (error) {
        alert(error.message);
        setLoading(false);
      } else if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: formData.fullName,
          company_name: formData.companyName,
          reputation_score: role === 'builder' ? 100 : 0
        });

        router.push(role === 'builder' ? '/builder/dashboard' : '/buyer/discover');
      }
    }
  };

  const isBuilder = role === 'builder';

  if (loading && !formData.email) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isBuilder ? 'bg-[#0b1120]' : 'bg-slate-50'}`}>
        <div className={`w-12 h-12 border-4 rounded-full animate-spin ${isBuilder ? 'border-slate-800 border-t-indigo-500' : 'border-slate-200 border-t-blue-600'}`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-6 font-sans transition-colors duration-500 ${isBuilder ? 'bg-[#0b1120]' : 'bg-slate-50'}`}>
      <div className={`w-full max-w-md p-8 sm:p-10 rounded-3xl shadow-2xl transition-colors duration-500 border ${isBuilder ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
        
        <div className="text-center mb-8">
          <h1 className={`text-2xl font-black tracking-tight mb-2 ${isBuilder ? 'text-white' : 'text-slate-900'}`}>
            Platform<span className="text-blue-600">.ai</span>
          </h1>
          <p className={`text-sm font-bold uppercase tracking-widest ${isBuilder ? 'text-indigo-400' : 'text-slate-400'}`}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </p>
        </div>

        <div className={`flex p-1 rounded-xl mb-8 ${isBuilder ? 'bg-slate-900' : 'bg-slate-100'}`}>
          <button 
            type="button"
            onClick={() => setRole('buyer')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${!isBuilder ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Buyer
          </button>
          <button 
            type="button"
            onClick={() => setRole('builder')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${isBuilder ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Builder
          </button>
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold transition-all border shadow-sm ${isBuilder ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center my-5">
          <div className={`flex-1 border-t ${isBuilder ? 'border-slate-800' : 'border-slate-200'}`}></div>
          <span className={`px-4 text-[10px] font-bold uppercase tracking-widest ${isBuilder ? 'text-slate-500' : 'text-slate-400'}`}>
            Or use email
          </span>
          <div className={`flex-1 border-t ${isBuilder ? 'border-slate-800' : 'border-slate-200'}`}></div>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {!isLogin && (
            <>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${isBuilder ? 'text-slate-400' : 'text-slate-500'}`}>Full Name</label>
                <input required type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isBuilder ? 'bg-slate-900 border border-slate-800 text-white focus:border-indigo-500' : 'bg-white border border-slate-200 text-slate-900 focus:border-blue-500'}`} />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${isBuilder ? 'text-slate-400' : 'text-slate-500'}`}>Company Name (Optional)</label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isBuilder ? 'bg-slate-900 border border-slate-800 text-white focus:border-indigo-500' : 'bg-white border border-slate-200 text-slate-900 focus:border-blue-500'}`} />
              </div>
            </>
          )}

          <div>
            <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${isBuilder ? 'text-slate-400' : 'text-slate-500'}`}>Email Address</label>
            <input required type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isBuilder ? 'bg-slate-900 border border-slate-800 text-white focus:border-indigo-500' : 'bg-white border border-slate-200 text-slate-900 focus:border-blue-500'}`} />
          </div>

          <div>
            <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${isBuilder ? 'text-slate-400' : 'text-slate-500'}`}>Password</label>
            <input required type="password" name="password" value={formData.password} onChange={handleChange} className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isBuilder ? 'bg-slate-900 border border-slate-800 text-white focus:border-indigo-500' : 'bg-white border border-slate-200 text-slate-900 focus:border-blue-500'}`} />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest mt-2 transition-all disabled:opacity-50 ${isBuilder ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'}`}
          >
            {loading ? 'Authenticating...' : (isLogin ? `Log In as ${role}` : 'Create Account')}
          </button>
        </form>

        <div className={`mt-8 text-center border-t pt-6 ${isBuilder ? 'border-slate-800' : 'border-slate-100'}`}>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className={`text-xs font-bold uppercase tracking-widest hover:underline ${isBuilder ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. We export the Suspense Boundary as the default page
export default function AuthGateway() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b1120] flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Security Gateway...</div>}>
      <AuthContent />
    </Suspense>
  );
}