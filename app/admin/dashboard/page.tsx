"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';

type AdminView = 'overview' | 'verifications' | 'disputes' | 'transactions';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AdminView>('overview');

  // Admin State
  const [adminUser, setAdminUser] = useState<any>(null);
  
  // Platform Metrics
  const [metrics, setMetrics] = useState({ gmv: 0, revenue: 0, lockedEscrow: 0, activeUsers: 0 });
  
  // Data Queues
  const [verifications, setVerifications] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function initializeAdmin() {
      // 1. Authenticate & Verify Admin Status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: profile } = await supabase.from('profiles').select('is_admin, full_name, avatar_url').eq('id', user.id).single();
      
      if (!profile?.is_admin) {
        alert("Unauthorized. Access denied.");
        router.push('/');
        return;
      }
      setAdminUser(profile);

      // 2. Fetch Platform Analytics
      await fetchPlatformData();
      setLoading(false);
    }
    initializeAdmin();
  }, [router]);

  const fetchPlatformData = async () => {
    try {
      // Fetch Users
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      // Fetch Collabs (For Financials & Disputes)
      const { data: collabs } = await supabase
        .from('collabs')
        .select(`
          *, 
          buyer:profiles!buyer_id(full_name, email), 
          builder:profiles!builder_id(full_name, email)
        `);

      // Fetch Profiles (For Verifications)
      const { data: experts } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_freelancer', true)
        .order('created_at', { ascending: false });

      if (collabs && experts) {
        let gmv = 0;
        let escrow = 0;
        let activeDisputes: any[] = [];
        let completedTxs: any[] = [];

        collabs.forEach(c => {
          if (c.status === 'completed' || c.status === 'released') {
            gmv += Number(c.escrow_amount_usd);
            completedTxs.push(c);
          }
          if (c.status === 'funded' || c.status === 'in_progress' || c.status === 'submitted' || c.status === 'disputed') {
            escrow += Number(c.escrow_amount_usd);
          }
          if (c.status === 'disputed') {
            activeDisputes.push(c);
          }
        });

        setMetrics({
          gmv,
          revenue: gmv * 0.05, // 5% platform fee assumption
          lockedEscrow: escrow,
          activeUsers: count || 0
        });

        setDisputes(activeDisputes);
        setTransactions(completedTxs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        
        // Unverified experts requesting verification (Mocking the logic: all unverified freelancers)
        setVerifications(experts.filter(e => !e.is_verified));
      }
    } catch (err) {
      console.error("Admin aggregation error:", err);
    }
  };

  // --- ADMIN ACTIONS ---
  const handleVerifyExpert = async (expertId: string, status: 'verified' | 'top') => {
    if (!window.confirm(`Grant ${status} status to this expert?`)) return;
    
    const payload = status === 'top' 
      ? { is_verified: true, is_top_expert: true } 
      : { is_verified: true };

    const { error } = await supabase.from('profiles').update(payload).eq('id', expertId);
    if (!error) {
      alert("Verification granted.");
      fetchPlatformData(); // Refresh
    }
  };

  const handleResolveDispute = async (collabId: string, decision: 'buyer_refund' | 'builder_release') => {
    if (!window.confirm(`Resolve this dispute in favor of the ${decision === 'buyer_refund' ? 'BUYER' : 'BUILDER'}? This will permanently release the escrow funds.`)) return;

    // In a real financial app, this would trigger Stripe refunds/payouts.
    // For now, we update the state machine.
    const newStatus = decision === 'buyer_refund' ? 'cancelled' : 'released';
    
    const { error } = await supabase.from('collabs').update({ status: newStatus }).eq('id', collabId);
    if (!error) {
      alert("Dispute resolved and vault unlocked.");
      fetchPlatformData();
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center font-black uppercase tracking-widest text-xs text-slate-500 animate-pulse">Initializing God Mode...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-rose-200 selection:text-rose-900">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 sticky top-0 md:h-screen z-40 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-900/20">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Zelance OS</p>
            <p className="text-sm font-black text-white">Admin Root</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-3 mt-2">Platform Control</p>
          <button onClick={() => setActiveView('overview')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'overview' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            Metrics & Overview
          </button>
          <button onClick={() => setActiveView('verifications')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex justify-between items-center ${activeView === 'verifications' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <span>Verifications</span>
            {verifications.length > 0 && <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full">{verifications.length}</span>}
          </button>
          <button onClick={() => setActiveView('disputes')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex justify-between items-center ${activeView === 'disputes' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <span>Disputes</span>
            {disputes.length > 0 && <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full">{disputes.length}</span>}
          </button>
          <button onClick={() => setActiveView('transactions')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'transactions' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            Global Ledger
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1 mt-auto">
          <Link href="/" className="w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white">
            Exit Admin Node
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">

          {/* VIEW: OVERVIEW */}
          {activeView === 'overview' && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Summary</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Real-time marketplace telemetry and financial throughput.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Platform GMV</p>
                  <p className="text-3xl font-black text-slate-900">${metrics.gmv.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2 relative z-10">Zelance Revenue (5%)</p>
                  <p className="text-3xl font-black text-white relative z-10">${metrics.revenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vault (Locked Escrow)</p>
                  <p className="text-3xl font-black text-rose-600">${metrics.lockedEscrow.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Registered Users</p>
                  <p className="text-3xl font-black text-blue-600">{metrics.activeUsers}</p>
                </div>
              </div>
            </>
          )}

          {/* VIEW: VERIFICATIONS */}
          {activeView === 'verifications' && (
            <div className="animate-in fade-in">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Trust & Safety: Verifications</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Review expert applications and grant platform badges.</p>
              </div>

              {verifications.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Queue is clear.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {verifications.map(expert => (
                    <div key={expert.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 relative shrink-0">
                          <Image src={expert.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200'} fill className="object-cover" alt={expert.full_name} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 leading-tight">{expert.full_name}</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{expert.headline}</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Claimed Stack</p>
                        <div className="flex flex-wrap gap-1.5">
                          {expert.tech_stack?.slice(0,5).map((t: string) => <span key={t} className="bg-white border border-slate-200 px-2 py-1 rounded text-[8px] font-black uppercase text-slate-600">{t}</span>)}
                          {expert.tech_stack?.length > 5 && <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[8px] font-black uppercase text-slate-600">+{expert.tech_stack.length - 5}</span>}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => window.open(`/profile/${expert.id}`, '_blank')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                          Audit Profile
                        </button>
                        <button onClick={() => handleVerifyExpert(expert.id, 'verified')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                          Verify
                        </button>
                        <button onClick={() => handleVerifyExpert(expert.id, 'top')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                          Top Expert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: DISPUTES */}
          {activeView === 'disputes' && (
            <div className="animate-in fade-in">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-rose-600 tracking-tight flex items-center gap-3">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Active Arbitration
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Review locked escrow vaults and execute executive overrides.</p>
              </div>

              {disputes.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Zero active disputes. All systems nominal.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {disputes.map(dispute => (
                    <div key={dispute.id} className="bg-white border-2 border-rose-100 rounded-3xl p-6 md:p-8 shadow-md">
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                         <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Escrow ID: {dispute.id.split('-')[0]}</p>
                           <h3 className="text-xl font-black text-slate-900">{dispute.title}</h3>
                         </div>
                         <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl border border-rose-200 text-center min-w-[150px]">
                           <p className="text-[9px] font-black uppercase tracking-widest mb-0.5">Locked Vault</p>
                           <p className="text-2xl font-black">${dispute.escrow_amount_usd.toLocaleString()}</p>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                         <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">The Buyer (Client)</p>
                           <p className="text-sm font-black text-slate-900">{dispute.buyer?.full_name}</p>
                           <p className="text-xs text-slate-500 font-medium">{dispute.buyer?.email}</p>
                         </div>
                         <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">The Builder (Expert)</p>
                           <p className="text-sm font-black text-slate-900">{dispute.builder?.full_name}</p>
                           <p className="text-xs text-slate-500 font-medium">{dispute.builder?.email}</p>
                         </div>
                       </div>

                       <div className="flex flex-col sm:flex-row gap-3">
                         <button onClick={() => window.open(`/collab/${dispute.id}`, '_blank')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> Audit Workspace
                         </button>
                         <button onClick={() => handleResolveDispute(dispute.id, 'buyer_refund')} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors">
                           Refund Buyer
                         </button>
                         <button onClick={() => handleResolveDispute(dispute.id, 'builder_release')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors">
                           Release to Builder
                         </button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: TRANSACTIONS */}
          {activeView === 'transactions' && (
            <div className="animate-in fade-in">
               <div className="mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Global Ledger</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Audit trail of all finalized escrow payouts across the platform.</p>
                </div>
                <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-600 transition-colors">
                  Export CSV
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-5">Date</th>
                        <th className="px-6 py-5">Escrow ID</th>
                        <th className="px-6 py-5">Buyer</th>
                        <th className="px-6 py-5">Builder</th>
                        <th className="px-6 py-5 text-right">GMV Transferred</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-mono text-[10px] font-bold text-slate-400">{tx.id.split('-')[0]}</td>
                          <td className="px-6 py-4 font-black text-slate-900">{tx.buyer?.full_name}</td>
                          <td className="px-6 py-4 font-black text-slate-900">{tx.builder?.full_name}</td>
                          <td className="px-6 py-4 text-right font-black text-green-600">${Number(tx.escrow_amount_usd).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}