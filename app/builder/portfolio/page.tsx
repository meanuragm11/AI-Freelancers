import React from 'react';

/* ── Bulletproof Inline SVG Icons ─────────────────────────────────── */
const PlusCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PencilSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ServerStackIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '24px', height: '24px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
  </svg>
);

export default function BuilderPortfolio() {
  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-10 w-full font-sans">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Portfolio & Services</h1>
            <p className="text-base text-slate-500 font-medium mt-1">Manage your public AI tools, custom service listings, and pricing.</p>
          </div>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 uppercase shrink-0 shadow-md">
            <EyeIcon /> View Public Profile
          </button>
        </div>

        {/* ── Bento Box Grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full items-start">

          {/* ── Left Column: Active Listings (Spans 7 of 12) ── */}
          <div className="xl:col-span-7 flex flex-col gap-6 w-full">
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <ServerStackIcon className="text-blue-600" />
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Active Listings</h2>
              </div>
            </div>

            {/* Listing Card 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">Published</span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">Custom Service</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">CRM WhatsApp Integration</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-2">Full setup of n8n webhooks to connect WhatsApp Business API with HubSpot for lead routing.</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-slate-900">₹45,000</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Starting Price</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">n8n</span>
                  <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">HubSpot API</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><PencilSquareIcon /></button>
                  <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon /></button>
                </div>
              </div>
            </div>

            {/* Listing Card 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">Published</span>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">Plug & Play Tool</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Real Estate Lead Qualification Bot</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-2">Interactive web chatbot powered by Claude 3.5 Sonnet to pre-qualify property buyers.</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-slate-900">₹15,000<span className="text-sm text-slate-500 font-medium">/mo</span></p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Subscription</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">Claude 3.5</span>
                  <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">FastAPI</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><PencilSquareIcon /></button>
                  <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon /></button>
                </div>
              </div>
            </div>

          </div>

          {/* ── Right Column: The Publishing Engine (Spans 5 of 12) ── */}
          <div className="xl:col-span-5 w-full sticky top-8">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden w-full">
              
              <div className="px-8 py-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
                <PlusCircleIcon className="text-blue-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Create New Listing</h3>
              </div>

              <div className="p-8 flex flex-col gap-5 bg-slate-950">
                
                {/* Field: Title */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Title</label>
                  <input type="text" placeholder="e.g., Custom AI Voice Receptionist" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" />
                </div>

                {/* Field Row: Category & Pricing Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none">
                      <option>Custom Service build</option>
                      <option>Plug & Play Software</option>
                      <option>Consulting / Audits</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pricing Model</label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none">
                      <option>Flat Project Fee</option>
                      <option>Hourly Rate</option>
                      <option>Monthly Subscription</option>
                    </select>
                  </div>
                </div>

                {/* Field: Price */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    <input type="number" placeholder="25000" className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" />
                  </div>
                </div>

                {/* Field: Tech Stack Tags */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tech Stack (Comma Separated)</label>
                  <input type="text" placeholder="e.g., Python, OpenAI, Vapi" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" />
                </div>

                {/* Field: Interactive Demo Embed */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interactive Demo URL</label>
                    <span className="bg-blue-900/50 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-sm">Optional</span>
                  </div>
                  <input type="url" placeholder="https://your-bot-demo-link.com" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" />
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Provide a secure iFrame link to allow buyers to test your tool directly on your profile.</p>
                </div>

                {/* Submit Action */}
                <button className="w-full bg-blue-600 text-white py-4 rounded-xl text-sm font-bold tracking-widest hover:bg-blue-500 transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.3)] mt-2 uppercase">
                  Publish to Marketplace
                </button>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}