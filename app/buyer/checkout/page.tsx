"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/* ── Inline SVG Icons ── */
const LockClosedIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// 1. Move logic into a content component
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toolId = searchParams.get('id');

  const [tool, setTool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchTool() {
      if (!toolId) return;
      const { data } = await supabase
        .from('listings')
        .select('*, profiles(company_name)')
        .eq('id', toolId)
        .single();
      
      if (data) setTool(data);
      setLoading(false);
    }
    fetchTool();
  }, [toolId]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && tool) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30);

      const { error } = await supabase.from('active_subscriptions').insert({
        buyer_id: user.id,
        listing_id: tool.id,
        amount: tool.price,
        renewal_date: renewalDate.toISOString(),
        status: 'active'
      });

      if (!error) {
        router.push('/buyer/stack');
      } else {
        console.error("Checkout failed:", error);
        alert("Payment failed. Please try again.");
        setProcessing(false);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-bold tracking-widest text-slate-400 uppercase animate-pulse">Initializing Checkout...</div>;
  }

  if (!tool) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-bold tracking-widest text-slate-400 uppercase">Tool not found</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      <div className="w-full md:w-1/2 bg-slate-50 p-8 md:p-16 border-r border-slate-200 flex flex-col">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Platform<span className="text-blue-600">.ai</span></h1>
        
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subscribe to</p>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-2xl border border-blue-200">
            {tool.title.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">{tool.title}</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">By {tool.profiles?.company_name || 'Verified Builder'}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 mb-8">
          <div className="flex justify-between items-center text-slate-600">
            <span className="text-sm font-medium">Monthly Subscription</span>
            <span className="text-sm font-black text-slate-900">₹{tool.price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="text-sm font-medium text-slate-400">Platform Provisioning Fee</span>
            <span className="text-sm font-black text-green-600">Free</span>
          </div>
        </div>

        <div className="flex justify-between items-end border-t border-slate-200 pt-6 mt-auto">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Due Today</span>
          <div className="text-right">
            <span className="text-4xl font-black text-slate-900">₹{tool.price.toLocaleString()}</span>
            <p className="text-xs text-slate-400 font-medium mt-1">Renews automatically. Cancel anytime.</p>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center relative">
        {processing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Processing Payment...</p>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1"><LockClosedIcon className="w-3 h-3"/> Bank grade encryption</p>
          </div>
        )}

        <div className="max-w-md w-full mx-auto">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            Payment Details <LockClosedIcon className="text-slate-400" />
          </h2>

          <form onSubmit={handleCheckout} className="flex flex-col gap-5">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Email Address</label>
              <input required type="email" placeholder="you@company.com" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Card Information</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <input required type="text" placeholder="Card number" className="w-full bg-white border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
                <div className="flex">
                  <input required type="text" placeholder="MM / YY" className="w-1/2 bg-white border-r border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
                  <input required type="text" placeholder="CVC" className="w-1/2 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Name on Card</label>
              <input required type="text" placeholder="Full Name" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-widest mt-4 hover:bg-slate-800 transition-colors shadow-md">
              Subscribe & Provision
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-3">
            <CheckCircleIcon className="text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              By confirming your subscription, you allow Platform.ai to charge your card for this payment and future payments in accordance with their terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Export the component wrapped in Suspense
export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold tracking-widest uppercase text-sm">Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}