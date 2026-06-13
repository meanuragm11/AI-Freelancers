"use client";

import React, { useEffect, useState } from 'react';

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
const ShieldExclamationIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default function PreviewLivePage() {
  const [data, setData] = useState<any>(null);

  // Read the draft data from the browser's memory
  useEffect(() => {
    const draft = localStorage.getItem('platform_tool_draft');
    if (draft) {
      setData(JSON.parse(draft));
    }
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Loading Live Preview...</p>
      </div>
    );
  }

  // Parse strings into arrays for the UI
  const tags = data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
  const features = data.features ? data.features.split('\n').map((f: string) => f.trim()).filter(Boolean) : [];
  const integrations = data.integrations ? data.integrations.split(',').map((i: string) => i.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      
      {/* ── Preview Warning Banner ── */}
      <div className="bg-amber-100 border-b border-amber-200 px-6 py-3 flex items-center justify-center gap-2 text-amber-800">
        <ShieldExclamationIcon />
        <span className="text-xs font-bold uppercase tracking-widest">Builder Preview Mode — This is exactly how buyers will see your listing.</span>
      </div>

      {/* ── Detailed Buyer UI ── */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 mt-10 flex flex-col lg:flex-row gap-10">
        
        {/* Left Column: Product Details */}
        <div className="w-full lg:w-2/3 flex flex-col gap-8">
          
          {/* Header Section */}
          <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-3xl border border-blue-200 shadow-sm shrink-0">
                {data.title ? data.title.substring(0, 2).toUpperCase() : 'AI'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.title || 'Untitled Tool'}</h1>
                </div>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-4">By {data.companyName}</p>
                
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                    {data.type === 'product' ? 'SaaS Product' : 'Custom Service'}
                  </span>
                  {data.demoUrl && (
                    <a href={data.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100 hover:bg-blue-100 transition-colors">
                      Live Demo <ArrowTopRightOnSquareIcon />
                    </a>
                  )}
                  {/* Verified Badge Placeholder (Greyed out for preview) */}
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-50 text-slate-400 border border-slate-200 uppercase tracking-widest cursor-help" title="Pending Verification">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Pending Verification
                  </span>
                </div>
              </div>
            </div>

            <p className="text-base text-slate-600 font-medium leading-relaxed">
              {data.description || 'Your core value proposition will appear here. Focus on the business problem this tool solves.'}
            </p>
          </div>

          {/* Features & Integrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Features */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Key Features</h3>
              {features.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircleIcon className="text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 font-medium">No features listed.</p>
              )}
            </div>

            {/* Integrations & Tags */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-8">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Integrations</h3>
                <div className="flex flex-wrap gap-2">
                  {integrations.length > 0 ? integrations.map((int: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      {int}
                    </span>
                  )) : <p className="text-sm text-slate-400 font-medium">Works standalone.</p>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? tags.map((tag: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {tag}
                    </span>
                  )) : <p className="text-sm text-slate-400 font-medium">None</p>}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Checkout Card */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl sticky top-24">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Subscription</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-4xl font-black text-slate-900">₹{data.price ? Number(data.price).toLocaleString() : '0'}</span>
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

            <button disabled className="w-full bg-slate-900 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-widest shadow-md opacity-50 cursor-not-allowed">
              Purchase Now
            </button>
            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mt-4">
              Disabled in Preview Mode
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}