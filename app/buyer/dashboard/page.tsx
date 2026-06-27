"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

// --- ICONS ---
const Icons = {
  Dashboard: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Projects: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Hire: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>,
  Assets: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Messages: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Escrow: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Saved: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
  Settings: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
};

export default function BuyerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // --- MASTER STATE ---
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // --- KPI & DATA STATES ---
  const [stats, setStats] = useState({ activeProjects: 0, pendingMilestones: 0, escrowBalance: 0, totalSpent: 0, purchasedAssets: 0, savedExperts: 0 });
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // --- 1. SECURE INITIALIZATION ---
  useEffect(() => {
    async function initializeDashboard() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/auth'); return; }
      setUser(currentUser);

      try {
        // Fetch Profile
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        if (profileData) setProfile(profileData);

        // Fetch Collabs (Projects)
        const { data: collabs } = await supabase
          .from('collabs')
          .select('*, profiles!builder_id(full_name, avatar_url, headline)')
          .eq('buyer_id', currentUser.id)
          .order('created_at', { ascending: false });

        // Fetch Component Purchases (Library)
        const { data: purchases } = await supabase.from('library').select('id').eq('user_id', currentUser.id);

        if (collabs) {
          let activeCount = 0;
          let pendingCount = 0;
          let escrowLocked = 0;
          let totalSpent = 0;

          const activeList: any[] = [];
          const activityTimeline: any[] = [];

          collabs.forEach((c: any) => {
            // Stats Aggregation
            if (c.status === 'in_progress' || c.status === 'funded') {
              activeCount++;
              escrowLocked += (c.escrow_amount_usd || 0);
              activeList.push(c);
            }
            if (c.status === 'completed') {
              totalSpent += (c.escrow_amount_usd || 0);
            }

            // Generate Timeline Events (Mocked structure for v1)
            activityTimeline.push({
              id: `act_${c.id}`,
              type: c.status === 'completed' ? 'delivered' : c.status === 'funded' ? 'funded' : 'started',
              title: c.title,
              expert: c.profiles?.full_name,
              amount: c.escrow_amount_usd,
              date: new Date(c.created_at)
            });
          });

          setActiveProjects(activeList.slice(0, 4)); // Show top 4 active
          
          setRecentActivity(activityTimeline.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5));

          setStats({
            activeProjects: activeCount,
            pendingMilestones: pendingCount, // Requires new milestones table mapping
            escrowBalance: escrowLocked,
            totalSpent: totalSpent,
            purchasedAssets: purchases?.length || 0,
            savedExperts: 0 // Requires saved_experts table
          });
        }

      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    initializeDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Authenticating Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-blue-200 selection:text-blue-900">
      
      {/* 1. ENTERPRISE SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 sticky top-0 md:h-screen overflow-y-auto hidden-scrollbar z-40">
        
        {/* User Identity Block */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Operating Client</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden relative shrink-0">
              <Image src={profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100&h=100'} fill sizes="40px" className="object-cover" alt="User" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-white truncate">{profile?.full_name || 'Client'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Enterprise Ready</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-2">Workspace</p>
          <Link href="/buyer/dashboard" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 bg-blue-600 text-white shadow-md">
            {Icons.Dashboard} Dashboard
          </Link>
          <Link href="/buyer/projects" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Projects} My Projects
          </Link>
          <Link href="/buyer/messages" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Messages} Messages <span className="ml-auto bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-md">2</span>
          </Link>

          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-6">Finances</p>
          <Link href="/buyer/payments" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Escrow} Escrow Ledger
          </Link>

          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-6">Discover</p>
          <Link href="/buyer/discover" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Hire} Hire AI Expert
          </Link>
          <Link href="/buyer/library" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Assets} Purchased Assets
          </Link>
          <Link href="/buyer/saved" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Saved} Saved Experts
          </Link>
        </nav>
        
        <div className="p-4 border-t border-slate-800 mt-auto">
          <Link href="/buyer/settings" className="w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 text-slate-400 hover:text-white">
            {Icons.Settings} Settings
          </Link>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Command Center</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Manage your AI projects, freelancers, and escrow balances.</p>
            </div>
            <Link href="/buyer/discover" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Create New Project
            </Link>
          </div>

          {/* --- KPI DASHBOARD --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active Projects</p>
              <p className="text-3xl font-black text-blue-600">{stats.activeProjects}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Escrow Locked</p>
              <p className="text-3xl font-black text-slate-900">${stats.escrowBalance.toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Spent</p>
              <p className="text-3xl font-black text-green-600">${stats.totalSpent.toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer hover:border-blue-300" onClick={() => router.push('/buyer/library')}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Purchased Assets</p>
              <p className="text-3xl font-black text-slate-900">{stats.purchasedAssets}</p>
            </div>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* --- MAIN COLUMN: CONTINUE WORKING --- */}
            <div className="xl:col-span-2 space-y-6">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Continue Working
                </h2>
                <Link href="/buyer/projects" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800">View All Projects</Link>
              </div>

              {activeProjects.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-4 border-slate-100">
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">No active projects.</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6 max-w-sm">Ready to build? Discover verified AI experts and initiate your first contract.</p>
                  <button onClick={() => router.push('/buyer/discover')} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors">
                    Find an Expert
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeProjects.map(project => (
                    <div key={project.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group flex flex-col md:flex-row gap-6">
                      
                      {/* Expert Identity */}
                      <div className="flex items-center md:items-start gap-4 md:w-1/4 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                        <div className="w-12 h-12 rounded-full overflow-hidden relative shrink-0 bg-slate-100">
                          <Image src={project.profiles?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100'} fill sizes="48px" className="object-cover" alt={project.profiles?.full_name || 'Expert'} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Freelancer</p>
                          <p className="text-sm font-black text-slate-900 truncate">{project.profiles?.full_name || 'Verified Expert'}</p>
                          <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">{project.profiles?.headline || 'AI Developer'}</p>
                        </div>
                      </div>

                      {/* Project Meta */}
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{project.title}</h4>
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0 ml-4 ${
                            project.status === 'funded' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {project.status === 'funded' ? 'Funded (Awaiting Start)' : 'In Progress'}
                          </span>
                        </div>

                        {/* Progress Bar (Mocked for V1 until Milestones table exists) */}
                        <div className="mt-2 mb-4">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Milestone 1: Development</span>
                            <span className="text-[10px] font-black text-slate-900">45%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-auto border-t border-slate-100 pt-4">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Escrow Locked</p>
                            <p className="text-sm font-black text-slate-900">${project.escrow_amount_usd?.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors hidden sm:block">
                              Message
                            </button>
                            <button onClick={() => router.push(`/buyer/collabs/${project.id}`)} className="bg-slate-900 hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                              Open Workspace
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- RIGHT COLUMN: ACTIVITY TIMELINE --- */}
            <div className="xl:col-span-1 space-y-6">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Recent Activity
              </h2>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-full">
                {recentActivity.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent alerts.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                    {recentActivity.map((event, idx) => (
                      <div key={event.id} className="relative pl-6 animate-in slide-in-from-right-4 fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                        {/* Timeline Node */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${
                          event.type === 'delivered' ? 'bg-green-500' : event.type === 'funded' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}></div>
                        
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {event.date.toLocaleDateString()}
                          </span>
                          <p className="text-xs font-black text-slate-900 leading-snug">
                            {event.type === 'delivered' ? 'Project Completed & Delivered' : 
                             event.type === 'funded' ? 'Escrow Funded' : 'Project Initiated'}
                          </p>
                          <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">
                            <span className="font-bold text-slate-700">{event.expert}</span> — {event.title}
                          </p>
                          {event.amount > 0 && (
                            <span className="inline-block mt-2 bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest w-max">
                              ${event.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* AI Insight Mini-Banner */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 relative overflow-hidden group cursor-pointer">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full group-hover:scale-125 transition-transform"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-800">AI Daily Summary</p>
                    </div>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      You have <strong>1 project</strong> awaiting review. Approving today keeps delivery schedules on track.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}