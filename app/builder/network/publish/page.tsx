"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/* ── Inline SVG Icons ── */
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const LockClosedIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

export default function NetworkPublishEngine() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action') || 'collab'; // 'collab', 'component', or 'arena'

  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Unified Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priceOrBudget: '',
    type: 'equity', // for collab: 'equity' or 'bounty'
    tagsOrLanguage: '',
    durationDays: '7', // for arena
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. If it requires payment (Bounty or Arena), trigger Escrow Simulation
    if ((action === 'collab' && formData.type === 'bounty') || action === 'arena') {
      setProcessingPayment(true);
      // Simulate Stripe/Bank Processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingPayment(false);
    }

    // 2. Route the data to the correct database table
    if (action === 'collab') {
      const tagArray = formData.tagsOrLanguage.split(',').map(t => t.trim()).filter(Boolean);
      await supabase.from('collab_posts').insert({
        builder_id: user.id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        budget: formData.priceOrBudget,
        tags: tagArray
      });
    } 
    else if (action === 'component') {
      await supabase.from('network_components').insert({
        builder_id: user.id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.priceOrBudget) || 0,
        language_tag: formData.tagsOrLanguage
      });
    }
    else if (action === 'arena') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(formData.durationDays));
      
      await supabase.from('arena_events').insert({
        sponsor_id: user.id,
        title: formData.title,
        description: formData.description,
        prize_pool: parseFloat(formData.priceOrBudget) || 0,
        end_time: endDate.toISOString(),
        is_active: true
      });
    }

    // 3. Return to the Network Hub
    router.push('/builder/network');
  };

  // Financial Calculations for the UI
  const rawAmount = parseFloat(formData.priceOrBudget) || 0;
  const arenaHostingFee = rawAmount * 0.20; // 20% fee
  const arenaTotal = rawAmount + arenaHostingFee;

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-300 font-sans relative pb-24">
      
      {/* ── Fixed Header ── */}
      <div className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center shadow-sm">
        <button onClick={() => router.back()} className="w-10 h-10 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-800 transition-colors mr-4">
          <ArrowLeftIcon />
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {action === 'collab' && 'Post to Collab Board'}
            {action === 'component' && 'Sell a Component'}
            {action === 'arena' && 'Host an Arena Throwdown'}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ── Payment Processing Overlay ── */}
        {processingPayment && (
          <div className="fixed inset-0 z-50 bg-[#0b1120]/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-black text-white mb-2">Securing Funds in Escrow...</h2>
            <p className="text-sm text-slate-400 flex items-center gap-2"><LockClosedIcon /> Bank-grade encryption active</p>
          </div>
        )}

        <div className="bg-[#0f172a] border border-slate-800 p-8 md:p-12 rounded-3xl shadow-xl flex flex-col gap-8">
          
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              {action === 'arena' ? 'Tournament Name' : 'Title'}
            </label>
            <input 
              name="title" value={formData.title} onChange={handleChange}
              placeholder={action === 'component' ? "e.g. Next.js Stripe Boilerplate" : "Brief and descriptive..."}
              className="w-full bg-[#111827] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Details & Requirements</label>
            <textarea 
              name="description" value={formData.description} onChange={handleChange} rows={4}
              placeholder="Provide clear details on exactly what you are offering or what you need built..."
              className="w-full bg-[#111827] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Conditional Type Select (Only for Collab) */}
            {action === 'collab' && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Collaboration Type</label>
                <select 
                  name="type" value={formData.type} onChange={handleChange}
                  className="w-full bg-[#111827] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none appearance-none"
                >
                  <option value="equity">Equity Split / Co-Founder</option>
                  <option value="bounty">Cash Bounty (Escrow)</option>
                </select>
              </div>
            )}

            {/* Price / Budget Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                {action === 'component' && 'Listing Price (₹)'}
                {action === 'arena' && 'Prize Pool (₹)'}
                {action === 'collab' && formData.type === 'bounty' && 'Cash Bounty Amount (₹)'}
                {action === 'collab' && formData.type === 'equity' && 'Equity Offered (%)'}
              </label>
              <input 
                type={formData.type === 'equity' ? 'text' : 'number'}
                name="priceOrBudget" value={formData.priceOrBudget} onChange={handleChange}
                placeholder={formData.type === 'equity' ? 'e.g. 10% - 20%' : '5000'}
                className="w-full bg-[#111827] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none transition-all"
              />
            </div>

            {/* Tags / Duration Input */}
            {action === 'arena' ? (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tournament Duration (Days)</label>
                <select 
                  name="durationDays" value={formData.durationDays} onChange={handleChange}
                  className="w-full bg-[#111827] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none appearance-none"
                >
                  <option value="3">3 Days (Blitz)</option>
                  <option value="7">7 Days (Standard)</option>
                  <option value="14">14 Days (Marathon)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                  {action === 'component' ? 'Primary Language (e.g. React)' : 'Tags (Comma Separated)'}
                </label>
                <input 
                  name="tagsOrLanguage" value={formData.tagsOrLanguage} onChange={handleChange}
                  placeholder={action === 'component' ? 'Python' : 'Next.js, Pinecone, API'}
                  className="w-full bg-[#111827] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none transition-all"
                />
              </div>
            )}
          </div>

          {/* ── Dynamic Escrow / Checkout Ledger ── */}
          {(action === 'arena' || (action === 'collab' && formData.type === 'bounty')) && (
            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-6 mt-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <LockClosedIcon /> Escrow Authorization
              </h3>
              
              {action === 'arena' ? (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm font-medium text-slate-400">
                    <span>Prize Pool Funding</span>
                    <span>₹{rawAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-slate-400">
                    <span>Platform Hosting Fee (20%)</span>
                    <span>₹{arenaHostingFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-3 border-t border-slate-800">
                    <span>Total Due Now</span>
                    <span className="text-amber-500">₹{arenaTotal.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm font-medium text-slate-400">
                    <span>Bounty Funding</span>
                    <span>₹{rawAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-slate-400">
                    <span>Escrow Processing</span>
                    <span className="text-emerald-500">Free</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-3 border-t border-slate-800">
                    <span>Total Due Now</span>
                    <span className="text-emerald-500">₹{rawAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Funds are held securely and only released when you approve the delivered code.</p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={loading || !formData.title}
            className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-colors shadow-md disabled:opacity-50 flex justify-center items-center gap-2
              ${action === 'component' || (action === 'collab' && formData.type === 'equity') 
                ? 'bg-blue-600 text-white hover:bg-blue-500' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
          >
            {loading ? 'Processing...' : 
              (action === 'component' ? 'List Component for Sale' : 
              (action === 'collab' && formData.type === 'equity' ? 'Post to Collab Board' : 
              <><LockClosedIcon /> Deposit Funds & Publish</>))
            }
          </button>

        </div>
      </div>
    </div>
  );
}