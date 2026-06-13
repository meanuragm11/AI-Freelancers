import React from 'react';

/* ── Bulletproof Inline SVG Icons (Explicitly Sized Failsafes) ─────────────────────────────────── */
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '28px', height: '28px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const MapPinIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);
const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
  </svg>
);
const MessageIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);
const FileCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
  </svg>
);
const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ActivityIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h3l2.25-7.5L12 19.5l2.25-7.5 1.5 4.5H21" />
  </svg>
);
const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073a2.25 2.25 0 01-2.25 2.25h-12a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h3.75M15.75 4.5a2.25 2.25 0 00-4.5 0" />
  </svg>
);
const ShieldCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const BarChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);
const CodeIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);
const WifiIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
  </svg>
);

/* ── Reusable Components ─────────────────────────────────────────────────────────────── */
const Stat = ({ label, value, star }: { label: string, value: string, star?: boolean }) => (
  <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl shadow-sm w-full">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <div className="flex items-center gap-1.5">
      <span className="text-3xl font-black text-slate-900">{value}</span>
      {star && <StarIcon className="text-blue-600" />}
    </div>
  </div>
);

const ReviewCard = ({ title, price, stars, date, review, filled }: any) => (
  <div className={`p-6 rounded-xl border border-slate-200 ${filled ? 'bg-slate-50' : 'bg-white'}`}>
    <div className="flex items-center justify-between gap-4 mb-3">
      <h3 className="font-bold text-slate-900 text-base">{title}</h3>
      <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
        {price}
      </span>
    </div>
    <div className="flex items-center gap-3 mb-4">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <StarIcon key={i} className={i < stars ? 'text-blue-600' : 'text-slate-200'} />
        ))}
      </div>
      <span className="text-sm font-medium text-slate-400">{date}</span>
    </div>
    <p className="text-sm text-slate-600 italic leading-relaxed">"{review}"</p>
  </div>
);

/* ── Main Layout ────────────────────────────────────────────────────────── */
export default function FreelancerProfileV2() {
  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-10 w-full font-sans">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-8">

        {/* ── 1. Header Row: Identity & Actions ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="h-2 bg-blue-600 w-full" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 p-8 w-full">
            
            {/* Identity Container */}
            <div className="flex items-center gap-6 min-w-0">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-md">
                AK
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight truncate">Arjun Kumar</h1>
                  <CheckCircleIcon className="text-blue-600" />
                </div>
                <p className="text-base text-slate-600 font-medium mb-3">Senior AI Automation Architect</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <MapPinIcon className="text-slate-400" /> Bengaluru, IN
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                    <ShieldCheckIcon /> Top 1% Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Container (Strict sizing applied) */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-64 shrink-0">
              <button style={{ minWidth: '220px' }} className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl text-sm font-bold tracking-widest hover:bg-blue-700 transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 uppercase">
                <FileCheckIcon /> Propose Contract
              </button>
              <button style={{ minWidth: '220px' }} className="w-full bg-white border-2 border-slate-900 text-slate-900 py-3.5 px-6 rounded-xl text-sm font-bold tracking-widest hover:bg-slate-900 hover:text-white transition-colors flex items-center justify-center gap-2 uppercase">
                <MessageIcon /> Send Message
              </button>
            </div>
            
          </div>
        </div>

        {/* ── 2. Stats Bar ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <Stat label="Success Rate" value="100%" />
          <Stat label="Jobs Completed" value="14" />
          <Stat label="Platform Rating" value="4.9" star />
        </div>

        {/* ── 3. Bento Box Body Grid ── */}
        <div className="flex flex-col xl:flex-row gap-8 w-full items-start">

          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-8 w-full">

            {/* Live Demo Console */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col w-full">
              <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <PlayIcon className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Live System Demo</p>
                    <p className="text-sm text-slate-500 font-medium">Real Estate Lead Qualification Bot</p>
                  </div>
                </div>
                <span className="flex items-center gap-2 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-lg shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  ONLINE
                </span>
              </div>

              {/* Demo Terminal Window */}
              <div className="w-full flex flex-col items-center justify-center relative group cursor-pointer bg-slate-900 h-80 overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-blue-600/20 group-hover:scale-110 transition-transform duration-300 relative z-10">
                  <PlayIcon className="text-blue-400 pl-1" />
                </div>
                <p className="font-bold text-white text-lg z-10">Initialize Interactive Demo</p>
                <p className="text-base text-slate-400 mt-2 z-10">Test the exact conversational flow live in your browser.</p>
                
                <div className="absolute bottom-0 left-0 w-full px-6 py-4 flex items-center justify-between bg-slate-950/80 border-t border-slate-800">
                  <span className="text-xs font-mono text-slate-400 tracking-wider">&gt; SYSTEM: CLAUDE 3.5 SONNET CONNECTED</span>
                  <span className="flex items-center gap-2 text-xs font-mono text-slate-400 tracking-wider">
                    <WifiIcon /> 120ms LATENCY
                  </span>
                </div>
              </div>
            </div>

            {/* Background & Stack Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                  <BriefcaseIcon className="text-blue-600" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Background</h2>
                </div>
                <p className="text-base text-slate-600 leading-relaxed">
                  I specialise in making business operations autonomous — architecting pipelines and
                  customer-facing agents that deflect up to 40% of tier-1 tickets and qualify leads
                  in under 5 seconds. I do not just write prompts; I build secure infrastructures.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                  <CodeIcon className="text-blue-600" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Core Stack</h2>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {['n8n / Make.com', 'OpenAI API', 'Python', 'FastAPI', 'Vapi (Voice AI)'].map((tech) => (
                    <span key={tech} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Work History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <BarChartIcon className="text-blue-600" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Platform Work History</h2>
              </div>
              <div className="space-y-5">
                <ReviewCard
                  title="CRM WhatsApp Integration"
                  price="₹45k"
                  stars={5}
                  date="May 2026"
                  review="The webhook integration between our WhatsApp API and HubSpot is flawless. Highly recommend him."
                  filled
                />
                <ReviewCard
                  title="Refund Automation Bot"
                  price="₹80k"
                  stars={4}
                  date="Feb 2026"
                  review="Deflected 30% of tier-1 tickets. Solid outcome. Communication was clear throughout the build process."
                />
              </div>
            </div>

          </div>

          {/* Right Column: Sticky Sidebar */}
          <div className="w-full xl:w-96 shrink-0 sticky top-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
              
              <div className="bg-slate-900 px-8 py-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Contract Terms</h3>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between px-8 py-5">
                  <div className="flex items-center gap-3 text-slate-600">
                    <ClockIcon className="text-slate-400 shrink-0" />
                    <span className="text-base font-medium">Hourly Rate</span>
                  </div>
                  <span className="text-base font-bold text-slate-900 bg-slate-100 px-4 py-1.5 rounded-lg border border-slate-200">
                    ₹2,500/hr
                  </span>
                </div>

                <div className="flex items-center justify-between px-8 py-5">
                  <div className="flex items-center gap-3 text-slate-600">
                    <FileCheckIcon className="text-slate-400 shrink-0" />
                    <span className="text-base font-medium">Project Min.</span>
                  </div>
                  <span className="text-base font-bold text-slate-900 bg-slate-100 px-4 py-1.5 rounded-lg border border-slate-200">
                    ₹20,000
                  </span>
                </div>

                <div className="flex items-center justify-between px-8 py-5">
                  <div className="flex items-center gap-3 text-slate-600">
                    <ActivityIcon className="text-slate-400 shrink-0" />
                    <span className="text-base font-medium">Availability</span>
                  </div>
                  <span className="text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-4 py-1.5 rounded-lg">
                    Available Now
                  </span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <div className="bg-blue-50/60 p-5 rounded-xl border border-blue-100">
                  <p className="text-sm font-black text-blue-900 mb-2 uppercase tracking-wide">Outcome-Based Pricing</p>
                  <p className="text-sm text-blue-800/80 leading-relaxed font-medium">
                    Accepts risk-sharing contracts where a % of final payment unlocks only upon
                    hitting specific metric targets — e.g. ticket deflection rates.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}