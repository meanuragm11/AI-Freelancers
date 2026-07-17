"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from '@/components/RemoteImage';
import { BuyerProjectCard } from '@/components/open-projects/BuyerProjectCard';

type ProjectStatusLabel = 'Active' | 'Pending' | 'Completed' | 'Disputed' | 'Cancelled';

type BuyerServiceCard = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceThumbnail: string | null;
  freelancerName: string;
  freelancerAvatar: string | null;
  status: ProjectStatusLabel;
  milestoneProgress: string;
  escrowLocked: number;
  nextDueDate: string | null;
  lastActivity: Date;
  completionPercentage: number;
};

type DashboardUser = {
  id: string;
};

type DashboardProfile = {
  full_name?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
};

type ServiceRelation = {
  id: string;
  title?: string | null;
  cover_image_url?: string | null;
};

type CollabRow = {
  id: string;
  buyer_id?: string | null;
  builder_id?: string | null;
  title?: string | null;
  status?: string | null;
  service_id?: string | null;
  escrow_amount_usd?: number | string | null;
  completion_percentage?: number | string | null;
  created_at?: string | null;
  profiles?: DashboardProfile | null;
  service?: ServiceRelation | null;
};

type RecentActivity = {
  id: string;
  type: 'delivered' | 'funded' | 'started';
  title?: string | null;
  expert?: string | null;
  amount: number;
  date: Date;
};

type MilestoneSummary = {
  id: string;
  collab_id: string;
  title?: string | null;
  status?: string | null;
  amount_usd?: number | string | null;
  due_date?: string | null;
  created_at?: string | null;
};

const ACTIVE_COLLAB_STATUSES = new Set(['funded', 'in_progress', 'submitted', 'active']);
const PENDING_COLLAB_STATUSES = new Set(['pending', 'pending_funding', 'draft']);
const COMPLETED_COLLAB_STATUSES = new Set(['completed', 'released']);
const CANCELLED_COLLAB_STATUSES = new Set(['cancelled', 'canceled', 'rejected']);
const LOCKED_MILESTONE_STATUSES = new Set(['funded', 'in_progress', 'submitted']);
const COMPLETED_MILESTONE_STATUSES = new Set(['approved', 'released', 'completed']);
const UPCOMING_MILESTONE_STATUSES = new Set(['draft', 'funded', 'in_progress', 'submitted']);

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(dateValue: string | null) {
  return dateValue ? new Date(dateValue).toLocaleDateString() : 'No due date';
}

function formatActivity(date: Date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function mapProjectStatus(status?: string | null): ProjectStatusLabel {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'disputed') return 'Disputed';
  if (COMPLETED_COLLAB_STATUSES.has(normalized)) return 'Completed';
  if (CANCELLED_COLLAB_STATUSES.has(normalized)) return 'Cancelled';
  if (ACTIVE_COLLAB_STATUSES.has(normalized)) return 'Active';
  if (PENDING_COLLAB_STATUSES.has(normalized)) return 'Pending';
  return 'Pending';
}

function getStatusClass(status: ProjectStatusLabel) {
  switch (status) {
    case 'Active':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Pending':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Completed':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'Disputed':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'Cancelled':
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function toDate(value?: string | null) {
  return value ? new Date(value) : null;
}

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
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  
  // --- KPI & DATA STATES ---
  const [stats, setStats] = useState({ activeProjects: 0, pendingMilestones: 0, escrowBalance: 0, totalSpent: 0, purchasedAssets: 0, savedExperts: 0 });
  const [myServices, setMyServices] = useState<BuyerServiceCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [openProjects, setOpenProjects] = useState<any[]>([]);

  const loadDashboard = useCallback(async (showInitialLoading = false) => {
      if (showInitialLoading) setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/auth'); return; }
      setUser(currentUser);

      try {
        const response = await fetch('/api/buyer/dashboard');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Dashboard load failed');

        setProfile(result.profile);
        setStats(result.stats);
        setMyServices((result.services || []).map((service: BuyerServiceCard & { lastActivity: string }) => ({
          ...service,
          lastActivity: new Date(service.lastActivity || Date.now()),
        })));
        setRecentActivity((result.recentActivity || []).map((activity: RecentActivity & { date: string }) => ({
          ...activity,
          date: new Date(activity.date || Date.now()),
        })));

        const projectsRes = await fetch('/api/projects?mine=true&limit=4');
        const projectsData = await projectsRes.json();
        setOpenProjects(projectsData.projects ?? []);

      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setLoading(false);
      }
  }, [router]);

  // --- 1. SECURE INITIALIZATION ---
  useEffect(() => {
    void Promise.resolve().then(() => loadDashboard(true));
  }, [loadDashboard]);

  // --- 2. REALTIME SERVICE UPDATES ---
  useEffect(() => {
    if (!user?.id) return;

    const refresh = () => {
      loadDashboard(false);
    };

    const channel = supabase
      .channel(`buyer_dashboard_services_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collabs', filter: `buyer_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadDashboard, user?.id]);

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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Client</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden relative shrink-0 flex items-center justify-center">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} fill sizes="40px" className="object-cover" alt="User" priority />
              ) : (
                <span className="text-slate-400 text-sm font-bold">{profile?.full_name?.charAt(0) || '?'}</span>
              )}
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
            {Icons.Projects} My Services
          </Link>
          <Link href="/buyer/open-projects" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Hire} Open Projects
          </Link>
          <Link href="/buyer/messages" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Messages} Messages
          </Link>

          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-6">Finances</p>
          <Link href="/buyer/billing" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Escrow} Escrow Ledger
          </Link>

          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-6">Discover</p>
          <Link href="/buyer/discover" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-slate-800 hover:text-white text-slate-400">
            {Icons.Hire} Explore AI Services
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Hire AI Expert
            </Link>
            <Link href="/projects/new" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-colors">
              Post Open Project
            </Link>
          </div>

          {/* --- KPI DASHBOARD --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active Projects</p>
              <p className="text-3xl font-black text-blue-600">{stats.activeProjects}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pending Milestones</p>
              <p className="text-3xl font-black text-amber-600">{stats.pendingMilestones}</p>
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
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer hover:border-blue-300" onClick={() => router.push('/buyer/library')} role="button" tabIndex={0}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Purchased Assets</p>
              <p className="text-3xl font-black text-slate-900">{stats.purchasedAssets}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer hover:border-blue-300" onClick={() => router.push('/buyer/saved')} role="button" tabIndex={0}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saved Experts</p>
              <p className="text-3xl font-black text-indigo-600">{stats.savedExperts}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* --- MAIN COLUMN: MY SERVICES --- */}
            <div className="xl:col-span-2 space-y-6">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg> Active Projects
                </h2>
                <Link href="/buyer/projects" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800">View All Projects</Link>
              </div>

              {myServices.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-4 border-slate-100">
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">No active projects yet</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6 max-w-sm">Fund a service or start a custom project to see active work here.</p>
                  <button onClick={() => router.push('/buyer/discover')} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors">
                    Explore AI Services
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5 md:flex-row md:overflow-x-auto md:pb-4 custom-scrollbar">
                  {myServices.map(service => (
                    <div key={service.id} className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all group overflow-hidden md:min-w-[380px] md:max-w-[420px]">
                      <div className="relative h-40 bg-slate-100">
                        {service.serviceThumbnail ? (
                          <Image src={service.serviceThumbnail} fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover" alt={service.serviceTitle} />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-blue-100 via-white to-slate-100 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Service</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent"></div>
                        <span className={`absolute top-4 right-4 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusClass(service.status)}`}>
                          {service.status}
                        </span>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h4 className="text-lg font-black text-white line-clamp-2 group-hover:text-blue-100 transition-colors">{service.serviceTitle}</h4>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-11 h-11 rounded-full overflow-hidden relative shrink-0 bg-slate-100 flex items-center justify-center border border-slate-200">
                            {service.freelancerAvatar ? (
                              <Image src={service.freelancerAvatar} fill sizes="44px" className="object-cover" alt={service.freelancerName} />
                            ) : (
                              <span className="text-slate-400 text-sm font-bold">{service.freelancerName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Freelancer</p>
                            <p className="text-sm font-black text-slate-900 truncate">{service.freelancerName}</p>
                          </div>
                        </div>

                        <div className="mb-5">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{service.milestoneProgress}</span>
                            <span className="text-[10px] font-black text-slate-900">{service.completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${service.completionPercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4 mb-5">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Escrow Locked</p>
                            <p className="text-sm font-black text-slate-900">{formatCurrency(service.escrowLocked)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Next Due</p>
                            <p className="text-sm font-black text-slate-900">{formatDate(service.nextDueDate)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Last Activity</p>
                            <p className="text-sm font-black text-slate-900">{formatActivity(service.lastActivity)}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button onClick={() => router.push(`/collab/${service.id}`)} className="flex-1 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                            Open Workspace
                          </button>
                          {service.serviceId ? (
                            <button onClick={() => router.push(`/service/${service.serviceId}`)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                              View Services
                            </button>
                          ) : (
                            <button disabled className="flex-1 bg-slate-50 text-slate-300 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                              View Services
                            </button>
                          )}
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
                
                
              </div>
            </div>

          </div>

          {/* --- MY OPEN PROJECTS --- */}
          <div className="mt-10">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                My Open Projects
              </h2>
              <div className="flex gap-3">
                <Link href="/projects/new" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700">Post New</Link>
                <Link href="/buyer/open-projects" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800">View All</Link>
              </div>
            </div>

            {openProjects.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 text-center">
                <p className="text-sm font-black text-slate-900 mb-1">No open projects posted</p>
                <p className="text-xs font-medium text-slate-500 mb-4">Post a project and receive proposals from verified AI experts.</p>
                <Link href="/projects/new" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Post a Project</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {openProjects.map((p) => (
                  <BuyerProjectCard key={p.id} project={p} compact />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
