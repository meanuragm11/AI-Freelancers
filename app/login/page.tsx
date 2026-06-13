"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

/* ── Inline SVG Icons ── */
const ShieldCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6">
      
      {/* ── Brand Header ── */}
      <div className="mb-8 text-center">
        <span className="text-3xl font-black text-slate-900 tracking-tight">
          Platform<span className="text-blue-600">.ai</span>
        </span>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
          The Zero-Fee B2B AI Marketplace
        </p>
      </div>

      {/* ── Login Box (Bento Box Architecture) ── */}
      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
        
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Welcome Back</h1>
          <p className="text-sm font-medium text-slate-500">Sign in to manage your AI stack or builder pipeline.</p>
        </div>

        {/* Supabase Auth Widget with Deep Brand Overrides */}
        <Auth 
          supabaseClient={supabase} 
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#2563eb', // Tailwind blue-600
                  brandAccent: '#1d4ed8', // Tailwind blue-700
                  inputText: '#0f172a', // Tailwind slate-900
                  inputBorder: '#e2e8f0', // Tailwind slate-200
                  inputBorderFocus: '#2563eb',
                  inputBorderHover: '#cbd5e1',
                  inputPlaceholder: '#94a3b8',
                  messageText: '#64748b',
                  anchorTextColor: '#2563eb',
                  anchorTextHoverColor: '#1e40af',
                },
                radii: {
                  borderRadiusButton: '0.75rem', // Tailwind rounded-xl
                  buttonBorderRadius: '0.75rem',
                  inputBorderRadius: '0.75rem',
                },
                fonts: {
                  bodyFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
                  buttonFontFamily: `inherit`,
                  inputFontFamily: `inherit`,
                  labelFontFamily: `inherit`,
                },
                borderWidths: {
                  buttonBorderWidth: '1px',
                  inputBorderWidth: '1px',
                }
              }
            },
            className: {
              button: 'font-bold tracking-widest uppercase text-xs py-3.5 shadow-sm transition-all',
              input: 'font-medium text-sm px-4 py-3 bg-slate-50 focus:bg-white transition-colors',
              label: 'font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-2',
              anchor: 'text-sm font-bold',
              message: 'text-sm font-medium bg-red-50 text-red-600 p-3 rounded-lg border border-red-100',
              divider: 'bg-slate-100',
            }
          }}
          providers={['google']} 
        />
      </div>

      {/* ── Trust Badge ── */}
      <div className="mt-8 flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        <ShieldCheckIcon className="w-4 h-4 text-slate-300" /> Secure Single Sign-On (SSO)
      </div>

    </div>
  );
}