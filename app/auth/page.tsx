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