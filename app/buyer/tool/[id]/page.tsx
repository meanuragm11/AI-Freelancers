"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

/* ── Inline SVG Icons ── */
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ArrowTopRightOnSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);
const BoltIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);
const ChatBubbleIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);
const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function LiveToolPage() {
  const params = useParams();
  const router = useRouter();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Enterprise Lead Modal State
  const [showModal, setShowModal] = useState(false);
  const [leadMessage, setLeadMessage] = useState('');
  const [sendingLead, setSendingLead] = useState(false);
  const [leadSent, setLeadSent] = useState(false);

  useEffect(() => {
    async function fetchTool() {
      const id = params?.id as string;
      if (!id) return;
      
      const { data: listing, error } = await supabase
        .from('listings')
        .select('*, profiles(company_name)')
        .eq('id', id)
        .single();

      if (listing) {
        setData(listing);
      } else {
        console.error("Supabase Error:", error?.message || "Row not found");
      }
      setLoading(false);
    }
    fetchTool();
  }, [params?.id]);

  // Lead Generation Engine
  const handleContactSales = async () => {
    setSendingLead(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user && data) {
      // 1. Insert directly into the Leads table
      const { error } = await supabase.from('leads').insert({
        builder_id: data.builder_id,
        buyer_name: user.user_metadata?.full_name || 'Enterprise Buyer',
        buyer_email: user.email,
        message: leadMessage,
        tool_id: data.id,
        status: 'unread'
      });

      if (!error) {
        setLeadSent(true);
        setTimeout(() => {
          setShowModal(false);
          setLeadSent(false);
          setLeadMessage('');
        }, 3000);
      } else {
        alert("Failed to send inquiry.");
      }
    }
    setSendingLead(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Loading Secure Database...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Tool Not Found</h1>
        <button onClick={() => router.back()} className="text-blue-600 font-bold uppercase tracking-widest text-sm">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">
      
      {/* ── Detailed Buyer UI ── */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 mt-10 flex flex-col lg:flex-row gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Left Column: Product Details */}
        <div className="w-full lg:w-2/3 flex flex-col gap-8">
          <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-3xl border border-blue-200 shadow-sm shrink-0">
                {data.title ? data.title.substring(0, 2).toUpperCase() : 'AI'}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{data.title}</h1>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-4">By {data.profiles?.company_name || 'Verified Builder'}</p>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                    {data.type === 'product' ? 'SaaS Product' : 'Custom Service'}
                  </span>
                  {data.demo_url && (
                    <a href={data.demo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100 hover:bg-blue-100 transition-colors">
                      Live Demo <ArrowTopRightOnSquareIcon />
                    </a>
                  )}
                  {data.is_verified ? (
                     <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-widest">
                       <CheckCircleIcon className="w-3.5 h-3.5" /> Verified
                     </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-50 text-slate-400 border border-slate-200 uppercase tracking-widest">
                      Verification Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-base text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
              {data.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Features */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Key Features</h3>
              {data.features && data.features.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {data.features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircleIcon className="text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 font-medium">Detailed features not provided.</p>
              )}
            </div>

            {/* Integrations & Tags */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-8">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Integrations</h3>
                <div className="flex flex-wrap gap-2">
                  {data.integrations && data.integrations.length > 0 ? data.integrations.map((int: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      {int}
                    </span>
                  )) : <p className="text-sm text-slate-400 font-medium">Works standalone.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Engine */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl sticky top-24">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Subscription</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-4xl font-black text-slate-900">₹{data.price.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-500 mb-1.5">/month</span>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-600">Platform Fee</span>
                <span className="text-sm font-black text-green-600">₹0 (0%)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-600">Cancel Anytime</span>
                <CheckCircleIcon className="text-slate-400 w-5 h-5" />
              </div>
            </div>

            {/* LIVE PURCHASE BUTTON */}
            <Link 
              href={`/buyer/checkout?id=${data.id}`}
              className="w-full bg-blue-600 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-widest shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-3"
            >
              <BoltIcon /> Purchase & Provision
            </Link>

            {/* NEW: CONTACT SALES BUTTON */}
            <button 
              onClick={() => setShowModal(true)}
              className="w-full bg-slate-100 text-slate-700 py-4 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <ChatBubbleIcon /> Contact Sales
            </button>
          </div>
        </div>
      </div>

      {/* ── Enterprise Inquiry Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900">
              <XMarkIcon />
            </button>

            {leadSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Inquiry Sent</h2>
                <p className="text-sm text-slate-500 font-medium">The builder will review your enterprise request and reach out shortly.</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Enterprise Inquiry</h2>
                <p className="text-sm text-slate-500 font-medium mb-6">Need custom SLAs, higher rate limits, or on-prem deployment? Send a direct message to {data.profiles?.company_name || 'the builder'}.</p>
                
                <textarea 
                  value={leadMessage}
                  onChange={(e) => setLeadMessage(e.target.value)}
                  placeholder="Hello, we are looking to deploy this across 500 seats. Can we discuss volume pricing and custom SLAs?"
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 resize-none mb-6"
                />

                <button 
                  onClick={handleContactSales}
                  disabled={sendingLead || !leadMessage.trim()}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {sendingLead ? 'Sending securely...' : 'Send Inquiry'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}