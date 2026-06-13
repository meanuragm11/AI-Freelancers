"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

/* ── Inline SVG Icons ── */
const KeyIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);
const CubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

export default function MyStackPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyStack() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch subscriptions and join the listing details
        const { data } = await supabase
          .from('active_subscriptions')
          .select('*, listings(*, profiles(company_name))')
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });
        
        if (data) setSubscriptions(data);
      }
      setLoading(false);
    }
    fetchMyStack();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Tech Stack...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto font-sans w-full min-h-screen">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Tech Stack</h1>
          <p className="text-base text-slate-500 font-medium mt-1">Manage your active AI deployments and API keys.</p>
        </div>
        <Link href="/buyer/discover" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold tracking-widest hover:bg-blue-700 transition-colors uppercase shadow-sm">
          Discover More Tools
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <CubeIcon className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-black text-slate-900 mb-2">No Active Deployments</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md">You haven't provisioned any AI tools yet. Head over to the Discovery Hub to supercharge your workflow.</p>
          <Link href="/buyer/discover" className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
            Go to Discovery Hub
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6 group hover:border-blue-300 transition-colors">
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {sub.listings?.title.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{sub.listings?.title}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">By {sub.listings?.profiles?.company_name || 'Builder'}</p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  Active
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <KeyIcon /> Production API Key
                </label>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-slate-900">pk_live_{sub.id.substring(0, 18)}...</code>
                  <button className="text-blue-600 font-bold text-[10px] uppercase tracking-widest hover:text-blue-800">Copy</button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Billing</p>
                  <p className="text-sm font-black text-slate-900">₹{sub.amount} <span className="text-xs text-slate-500 font-medium">/mo</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Next Renewal</p>
                  <p className="text-sm font-bold text-slate-700">{new Date(sub.renewal_date).toLocaleDateString()}</p>
                </div>
                <button className="text-slate-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors">Manage</button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}