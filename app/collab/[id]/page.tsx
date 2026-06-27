"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import MilestoneManager from '@/components/MilestoneManager';

type WorkspaceTab = 'overview' | 'milestones' | 'files';

export default function GlobalCollabWorkspace() {
  const router = useRouter();
  const params = useParams();
  const collabId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'buyer' | 'builder' | null>(null);
  
  const [collab, setCollab] = useState<any>(null);
  const [counterparty, setCounterparty] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('milestones');

  useEffect(() => {
    async function loadWorkspace() {
      if (!collabId) return;

      // 1. Authenticate User
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/auth'); return; }
      setUser(currentUser);

      // 2. Fetch Contract & Both Profiles
      const { data: collabData, error } = await supabase
        .from('collabs')
        .select(`
          *,
          buyer:profiles!buyer_id(id, full_name, avatar_url, headline),
          builder:profiles!builder_id(id, full_name, avatar_url, headline)
        `)
        .eq('id', collabId)
        .single();

      if (error || !collabData) {
        alert("Workspace not found or access denied.");
        router.push('/');
        return;
      }

      // 3. Security Routing & Role Assignment
      if (currentUser.id === collabData.buyer_id) {
        setUserRole('buyer');
        setCounterparty(collabData.builder);
      } else if (currentUser.id === collabData.builder_id) {
        setUserRole('builder');
        setCounterparty(collabData.buyer);
      } else {
        // Intruder detected. Kick them out.
        router.push('/');
        return;
      }

      setCollab(collabData);
      setLoading(false);
    }

    loadWorkspace();
  }, [collabId, router]);

  const handleMessageRoute = () => {
    // Routes to the respective inbox we built in Sprints 1-6
    if (userRole === 'buyer') router.push('/buyer/messages');
    else router.push('/builder/inbox');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Decrypting Secure Workspace...</p>
      </div>
    );
  }

  const isCompleted = collab.status === 'completed' || collab.status === 'released';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* GLOBAL WORKSPACE HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex items-center gap-4">
            <Link 
              href={userRole === 'buyer' ? '/buyer/dashboard' : '/builder/dashboard'} 
              className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {collab.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escrow ID: {collab.id.split('-')[0]}</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">{collab.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={handleMessageRoute} className="flex-1 md:flex-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> Message {userRole === 'buyer' ? 'Expert' : 'Client'}
            </button>
            {userRole === 'buyer' && !isCompleted && (
              <button className="flex-1 md:flex-none bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                End Contract
              </button>
            )}
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex flex-col lg:flex-row gap-8 lg:gap-12 animate-in fade-in duration-500 flex-1">
        
        {/* LEFT COLUMN: Navigation & Counterparty Profile */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
          
          {/* Counterparty Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
              {userRole === 'buyer' ? 'Hired Expert' : 'Enterprise Client'}
            </p>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 relative border border-slate-200">
                <Image src={counterparty?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200'} fill sizes="56px" className="object-cover" alt="Profile" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black text-slate-900 truncate">{counterparty?.full_name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{counterparty?.headline}</p>
              </div>
            </div>
            <button onClick={() => router.push(`/profile/${counterparty.id}`)} className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
              View Profile
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 sticky top-28">
            <button onClick={() => setActiveTab('milestones')} className={`text-left px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'milestones' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Milestones & Escrow
            </button>
            <button onClick={() => setActiveTab('overview')} className={`text-left px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Original Brief
            </button>
            <button onClick={() => setActiveTab('files')} className={`text-left px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'files' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
              Shared Files
            </button>
          </nav>
        </aside>

        {/* RIGHT COLUMN: Main Content Area */}
        {/* RIGHT COLUMN: Main Content Area Split into Workspace and Copilot */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-[600px]">
          
          <div className="flex-1 flex flex-col">
            {/* TAB 1: MILESTONES (The Engine) */}
            {activeTab === 'milestones' && (
              <MilestoneManager 
                collabId={collab.id} 
                currentUser={user} 
                userRole={userRole!} 
              />
            )}

            {/* TAB 2: ORIGINAL BRIEF */}
            {activeTab === 'overview' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm animate-in fade-in duration-300">
                <h2 className="text-xl font-black text-slate-900 mb-6 border-b border-slate-100 pb-4">Project Brief & Scope</h2>
                {/* ... keep original brief details ... */}
              </div>
            )}

            {/* TAB 3: SHARED FILES */}
            {activeTab === 'files' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center">
                 {/* ... keep file details ... */}
              </div>
            )}
          </div>

          {/* AI COPILOT & DISPUTE DRAWER PANEL */}
          <div className="w-full lg:w-80 shrink-0">
             <AICopilotTools 
               collabId={collab.id}
               currentUser={user}
               userRole={userRole!}
             />
          </div>

        </div>
          
          {/* TAB 1: MILESTONES (The Engine) */}
          {activeTab === 'milestones' && (
            <MilestoneManager 
              collabId={collab.id} 
              currentUser={user} 
              userRole={userRole!} 
            />
          )}

          {/* TAB 2: ORIGINAL BRIEF */}
          {activeTab === 'overview' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm animate-in fade-in duration-300">
              <h2 className="text-xl font-black text-slate-900 mb-6 border-b border-slate-100 pb-4">Project Brief & Scope</h2>
              
              <div className="space-y-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Initial Requirements</p>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    {collab.description}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contract Initiated</p>
                    <p className="text-sm font-black text-slate-900">{new Date(collab.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Initial Escrow Seed</p>
                    <p className="text-sm font-black text-blue-600">${collab.escrow_amount_usd.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHARED FILES (Placeholder for Sprint 11) */}
          {activeTab === 'files' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center animate-in fade-in duration-300">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                 <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
               </div>
               <h3 className="text-lg font-black text-slate-900 mb-1">Asset Vault</h3>
               <p className="text-sm font-medium text-slate-500 max-w-sm">Files shared in the messaging interface will be aggregated and organized here automatically.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}