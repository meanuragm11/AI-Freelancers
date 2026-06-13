"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

/* ── Bulletproof Inline SVG Icons ─────────────────────────────────── */
const CurrencyRupeeIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '24px', height: '24px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6l-3-3h1.5a3 3 0 100-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '24px', height: '24px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.428-1.428L13.5 18.75l1.178-.394a2.25 2.25 0 001.428-1.428L16.5 15.75l.394 1.178a2.25 2.25 0 001.428 1.428l1.178.394-1.178.394a2.25 2.25 0 00-1.428 1.428z" />
  </svg>
);
const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
const CubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function BuilderDashboard() {
  const [metrics, setMetrics] = useState({ mrr: 0, customers: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [myTools, setMyTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBuilderData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: listings } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            price,
            is_verified,
            active_subscriptions (
              id,
              amount,
              renewal_date,
              profiles ( full_name )
            )
          `)
          .eq('builder_id', user.id);

        if (listings) {
          let totalMrr = 0;
          let totalCustomers = 0;
          let sales: any[] = [];

          listings.forEach(listing => {
            if (listing.active_subscriptions) {
              listing.active_subscriptions.forEach((sub: any) => {
                totalMrr += Number(sub.amount);
                totalCustomers += 1;
                sales.push({
                  ...sub,
                  tool_name: listing.title
                });
              });
            }
          });

          sales.sort((a, b) => (a.id > b.id ? -1 : 1));

          setMetrics({ mrr: totalMrr, customers: totalCustomers });
          setRecentSales(sales);
          setMyTools(listings);
        }
      }
      setLoading(false);
    }
    
    fetchBuilderData();
  }, []);

  // ── THE DELETE ENGINE ──
  const handleDeleteTool = async (toolId: string, toolTitle: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${toolTitle}"? This will permanently remove it from the Discovery Hub.`);
    if (!confirmDelete) return;

    // Optimistic UI update: instantly remove it from the screen
    setMyTools(currentTools => currentTools.filter(tool => tool.id !== toolId));

    // Call the database to delete it permanently
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', toolId);

    if (error) {
      console.error("Error deleting tool:", error);
      alert("Failed to delete the tool. Please try again.");
      // Optional: If you wanted to be hyper-safe, you could re-fetch data here if it fails
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto font-sans w-full flex flex-col gap-10 bg-slate-50 min-h-screen">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Builder Command Center</h1>
          <p className="text-base text-slate-500 font-medium mt-1">Monitor your revenue and active enterprise deployments.</p>
        </div>
        <Link href="/builder/publish" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold tracking-widest hover:bg-blue-700 transition-colors uppercase shadow-md flex items-center gap-2">
          Publish New Tool <ArrowRightIcon />
        </Link>
      </div>

      {/* ── High-End Metrics Architecture ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* 1. Hero Revenue Card (Spans 2 columns) */}
        <div className="lg:col-span-2 relative overflow-hidden bg-slate-900 rounded-3xl p-8 shadow-xl flex flex-col justify-between border border-slate-800">
          <div className="absolute -right-32 -top-32 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center border border-slate-700 shadow-inner">
                <CurrencyRupeeIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Monthly Revenue</p>
                <h2 className="text-4xl md:text-5xl font-black text-white mt-1">
                  ₹{loading ? '...' : metrics.mrr.toLocaleString()}
                </h2>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <SparklesIcon />
              <span className="text-[10px] font-black uppercase tracking-widest">100% Take-Home (Zero Fees)</span>
            </div>
          </div>

          <div className="relative z-10 border-t border-slate-800 pt-6 mt-auto">
            {metrics.mrr === 0 && !loading ? (
              <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Awaiting your first transaction.
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Live routing active.
              </p>
            )}
          </div>
        </div>

        {/* 2. Active Customers Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="flex items-start justify-between mb-8">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
              <UsersIcon className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Subscribers</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900">
              {loading ? '...' : metrics.customers}
            </h2>
          </div>
        </div>
      </div>

      {/* ── SECTION: My Published Tools (Inventory) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <CubeIcon className="w-5 h-5 text-blue-600" /> My Published Tools
          </h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Inventory...</div>
        ) : myTools.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">You haven't published any tools yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
            {myTools.map((tool) => (
              <div key={tool.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-200">
                      {tool.title.substring(0, 2).toUpperCase()}
                    </div>
                    {tool.is_verified ? (
                       <span className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold bg-green-100 text-green-700 uppercase tracking-widest">
                         <CheckCircleIcon className="w-3 h-3" /> Verified
                       </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-[9px] font-bold bg-slate-200 text-slate-600 uppercase tracking-widest">
                        Pending
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{tool.title}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">₹{tool.price}/mo</p>
                </div>
                
                <div className="border-t border-slate-200 pt-4 flex gap-2">
                  <Link href={`/buyer/tool/${tool.id}`} className="flex-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-widest py-2 rounded-lg text-center hover:bg-slate-100 transition-colors">
                    View Live
                  </Link>
                  <Link href={`/builder/edit/${tool.id}`} className="flex-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-widest py-2 rounded-lg text-center hover:bg-slate-100 transition-colors">Edit</Link>
                  <button 
                    onClick={() => handleDeleteTool(tool.id, tool.title)} 
                    title="Delete Tool"
                    className="w-10 flex-shrink-0 bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Transactions Ledger ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Real-Time Ledger</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Syncing Secure Database...</div>
        ) : recentSales.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-2xl flex items-center justify-center mb-4 transform rotate-12">
              <CurrencyRupeeIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">No Active Deployments</h3>
            <p className="text-sm font-medium text-slate-500 max-w-sm">When enterprise buyers purchase your AI tools, the transactions will securely populate here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Buyer</th>
                  <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tool Provisioned</th>
                  <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Net Revenue</th>
                  <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Renewal Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((sale, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-5 px-8">
                      <p className="text-sm font-bold text-slate-900">{sale.profiles?.full_name || 'Anonymous Firm'}</p>
                    </td>
                    <td className="py-5 px-8">
                      <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
                        {sale.tool_name}
                      </span>
                    </td>
                    <td className="py-5 px-8">
                      <span className="text-sm font-black text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg">
                        + ₹{sale.amount}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-right text-sm font-bold text-slate-500">
                      {new Date(sale.renewal_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}