"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/* ── Bulletproof Admin SVG Icons (TypeScript Fixed) ── */
const ShieldExclamationIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-6 h-6 flex-shrink-0"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const BanknotesIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-6 h-6 flex-shrink-0"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const CheckBadgeIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-6 h-6 flex-shrink-0"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);

export default function AdminCommandCenter() {
  const [kycQueue, setKycQueue] = useState<any[]>([]);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [treasury, setTreasury] = useState({ escrow: 0, platformFees: 0 });

  useEffect(() => {
    async function fetchAdminData() {
      // 1. Fetch pending KYC Profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });
      if (profiles) setKycQueue(profiles);

      // 2. Fetch Active Escrow Bounties & Arena Events to calculate Treasury
      let totalEscrow = 0;
      let totalFees = 0;

      const { data: collabPosts } = await supabase.from('collab_posts').select('budget').eq('type', 'bounty');
      if (collabPosts) {
        collabPosts.forEach(p => {
          const amt = parseFloat(p.budget) || 0;
          totalEscrow += amt;
        });
      }

      const { data: arenaEvents } = await supabase.from('arena_events').select('prize_pool');
      if (arenaEvents) {
        arenaEvents.forEach(e => {
          const pool = parseFloat(e.prize_pool) || 0;
          totalFees += (pool * 0.20); // Platform takes 20% of Arena Pools as profit
          totalEscrow += pool;
        });
      }

      // Simulate Component Exchange Volume (15% take rate)
      const { data: activeSubs } = await supabase.from('active_subscriptions').select('amount');
      if (activeSubs) {
         activeSubs.forEach(s => {
           totalFees += (parseFloat(s.amount) * 0.05); // Simulated 5% take rate on SaaS subs for calculation
         });
      }

      setTreasury({ escrow: totalEscrow, platformFees: totalFees });
      setLoading(false);
    }

    fetchAdminData();
  }, []);

  // Admin Action: Approve Identity
  const handleApproveKyc = async (id: string, name: string) => {
    const confirm = window.confirm(`Grant "Verified" status to ${name}?`);
    if (!confirm) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true })
      .eq('id', id);

    if (!error) {
      setKycQueue(prev => prev.filter(p => p.id !== id));
      
      // Automatically verify their listings as well
      await supabase.from('listings').update({ is_verified: true }).eq('builder_id', id);
    } else {
      alert("Error approving KYC.");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-red-500 font-black tracking-widest uppercase text-sm animate-pulse">Initializing Root Access...</div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans p-6 md:p-10">
      
      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <p className="text-[10px] font-black tracking-[0.2em] text-red-500 uppercase">System Administrator</p>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Command Center</h1>
        </div>
        <button className="bg-slate-900 border border-slate-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
          Export Ledger (CSV)
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ── Column 1: Financial Treasury ── */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <BanknotesIcon /> Treasury Vault
          </h2>
          
          <div className="bg-[#0f0f11] border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <BanknotesIcon />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Funds in Escrow</p>
            <p className="text-4xl font-black text-white tracking-tight mb-2">₹{treasury.escrow.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium">Secured for pending bounties and Arena pools.</p>
          </div>

          <div className="bg-[#0f0f11] border border-red-900/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none"></div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Net Platform Profit</p>
            <p className="text-4xl font-black text-white tracking-tight mb-2">₹{treasury.platformFees.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium">Realized revenue from platform transaction fees.</p>
          </div>
        </div>

        {/* ── Column 2 & 3: KYC Queue ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
             <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
               <ShieldExclamationIcon /> Identity Verification Queue
             </h2>
             <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-red-500/20">
               {kycQueue.length} Pending
             </span>
          </div>

          <div className="bg-[#0f0f11] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-black/40">
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Builder / Company</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Support Email</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {kycQueue.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-500 text-sm font-medium">
                        Queue is empty. All builders have been verified.
                      </td>
                    </tr>
                  ) : (
                    kycQueue.map((profile) => (
                      <tr key={profile.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-white">{profile.full_name || 'Anonymous'}</p>
                          {profile.company_name && (
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{profile.company_name}</p>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-400 font-mono">
                          {profile.support_email || 'No email provided'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2 hover:bg-slate-800 rounded-md transition-colors">
                              View Docs
                            </button>
                            <button 
                              onClick={() => handleApproveKyc(profile.id, profile.company_name || profile.full_name)}
                              className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1"
                            >
                              <CheckBadgeIcon className="w-4 h-4" /> Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}