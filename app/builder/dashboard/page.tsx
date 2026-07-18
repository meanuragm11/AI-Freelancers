"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from '@/components/RemoteImage';
import ServiceManager from '@/components/builder/ServiceManager';
import ExpertOnboardingWizard from '@/components/builder/ExpertOnboardingWizard';
import PortfolioManager from '@/components/builder/PortfolioManager';
import EarningsLedgerPanel from '@/components/builder/EarningsLedgerPanel';
import BuilderRecognitionPanel from '@/components/builder/BuilderRecognitionPanel';
import NegotiationModal from '@/components/NegotiationModal';
import { ONBOARDING_COUNTRIES, type OnboardingProfileState } from '@/lib/onboarding/profile';
import { listBuilderProjectRequests } from '@/lib/project-requests';
import { ACTIVE_COLLAB_STATUSES, COMPLETED_COLLAB_STATUSES } from '@/lib/marketplace/status';
import { getDisplayNameInitials } from '@/lib/display/formatDisplayName';

const Icons = {
  Overview: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Projects: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Assets: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Messages: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Finances: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Profile: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
};

type DashboardView = 'overview' | 'projects' | 'messages' | 'finances' | 'settings' | 'services' | 'portfolio' | 'requests';

export default function UnifiedBuilderWorkspace() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  const [stats, setStats] = useState({ activeCollabs: 0, pendingEscrows: 0, netEarnings: 0, componentSales: 0 });
  const [recentCollabs, setRecentCollabs] = useState<any[]>([]);

  const [projectTabFilter, setProjectTabFilter] = useState<'all' | 'active' | 'completed'>('all');

  const [onboardingProfileSeed, setOnboardingProfileSeed] = useState<Partial<OnboardingProfileState>>();
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [negotiationModalOpen, setNegotiationModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const loadDashboard = useCallback(async (showInitialLoading = false) => {
    if (showInitialLoading) setLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      router.push('/auth');
      return;
    }
    setUser(currentUser);

    try {
      const response = await fetch('/api/builder/dashboard');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Dashboard load failed');

      setStats(result.stats);
      setRecentCollabs(result.collabs || []);

      const requests = await listBuilderProjectRequests(currentUser.id);
      setCustomRequests(requests || []);
    } catch (err) {
      console.error('Dashboard Load Error:', err);
    } finally {
      if (showInitialLoading) setLoading(false);
    }
  }, [router]);

  const handleOnboardingComplete = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (profileData) setProfile(profileData);
    }
    setIsFreelancer(true);
    await loadDashboard(true);
  }, [loadDashboard]);

  useEffect(() => {
    async function initializeWorkspace() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/auth');
        return;
      }
      setUser(currentUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        if (profileData.is_freelancer) {
          setIsFreelancer(true);
          await loadDashboard(true);
        } else {
          setOnboardingProfileSeed({
            full_name: profileData.full_name || '',
            headline: profileData.headline || '',
            location: profileData.location || ONBOARDING_COUNTRIES[4],
            bio: profileData.bio || '',
            tech_stack: profileData.tech_stack || [],
          });
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }

    void initializeWorkspace();
  }, [loadDashboard, router]);

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get('view');
    if (view === 'services' || view === 'portfolio' || view === 'projects' || view === 'finances' || view === 'requests' || view === 'overview') {
      setActiveView(view as DashboardView);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !isFreelancer) return;

    const refresh = () => {
      void loadDashboard(false);
    };

    const builderId = user.id;
    const tables = [
      { table: 'collabs', rowFilter: `builder_id=eq.${builderId}` },
      { table: 'milestones' },
      { table: 'transactions' },
      { table: 'escrow_transactions', rowFilter: `builder_id=eq.${builderId}` },
      { table: 'invoices', rowFilter: `builder_id=eq.${builderId}` },
    ] as const;

    let channel = supabase.channel(`builder_dashboard_${builderId}`);
    for (const entry of tables) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: entry.table,
          ...('rowFilter' in entry && entry.rowFilter ? { filter: entry.rowFilter } : {}),
        },
        refresh
      );
    }
    channel.subscribe();

    const refetchOnFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', refetchOnFocus);
    window.addEventListener('visibilitychange', refetchOnFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('focus', refetchOnFocus);
      window.removeEventListener('visibilitychange', refetchOnFocus);
    };
  }, [isFreelancer, loadDashboard, user?.id]);

  const isActiveCollab = (status?: string | null) =>
    (ACTIVE_COLLAB_STATUSES as readonly string[]).includes((status || '').toLowerCase());

  const isCompletedCollab = (status?: string | null) =>
    (COMPLETED_COLLAB_STATUSES as readonly string[]).includes((status || '').toLowerCase());

  const handleAcceptRequest = async (requestId: string) => {
    if (!user) return;
    try {
      const { data: request } = await supabase
        .from("project_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (!request) {
        alert("Request not found");
        return;
      }

      // Update request status to accepted
      await supabase.from("project_requests").update({ status: "accepted", agreed_amount_usd: request.budget_usd }).eq("id", requestId);

      // Update collab status to funded (waiting for payment)
      await supabase.from("collabs").update({ status: "negotiating" }).eq("id", request.conversation_id);

      // Send notification to buyer
      await supabase.from("messages").insert({
        collab_id: request.conversation_id,
        sender_id: user.id,
        text: `[[PROPOSAL_ACCEPTED]] Builder has accepted your project request "${request.title}". Please proceed to payment.`,
        content: `[[PROPOSAL_ACCEPTED]] Builder has accepted your project request "${request.title}". Please proceed to payment.`,
      });

      alert("Request accepted! Buyer will be notified to proceed with payment.");
      await loadDashboard(false);
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept request. Please try again.");
    }
  };

  const handleNegotiateRequest = (request: any) => {
    setSelectedRequest(request);
    setNegotiationModalOpen(true);
  };

  const handleNegotiationSubmit = async (proposal: any) => {
    if (!user) return;
    try {
      // Create negotiation history record
      const { error: negError } = await supabase.from("negotiation_history").insert({
        project_request_id: proposal.project_request_id,
        proposed_by: user.id,
        proposal_type: proposal.proposal_type,
        proposed_amount_usd: proposal.proposed_amount_usd,
        explanation: proposal.explanation,
        status: "pending",
        version: 1,
      });

      if (negError) throw negError;

      // Update project request status to negotiating
      await supabase.from("project_requests").update({ 
        status: "negotiating",
        negotiation_round: 1,
      }).eq("id", proposal.project_request_id);

      // Send notification to buyer
      const { data: request } = await supabase.from("project_requests").select("*, conversation_id").eq("id", proposal.project_request_id).single();
      
      if (request) {
        await supabase.from("messages").insert({
          collab_id: request.conversation_id,
          sender_id: user.id,
          text: `[[COUNTER_OFFER|${proposal.proposed_amount_usd}]] Builder has proposed a new price of $${proposal.proposed_amount_usd.toLocaleString()}.${proposal.explanation ? `\n\nExplanation: ${proposal.explanation}` : ''}`,
          content: `[[COUNTER_OFFER|${proposal.proposed_amount_usd}]] Builder has proposed a new price of $${proposal.proposed_amount_usd.toLocaleString()}.${proposal.explanation ? `\n\nExplanation: ${proposal.explanation}` : ''}`,
        });
      }

      alert("Proposal sent! Buyer will be notified.");
      await loadDashboard(false);
    } catch (error) {
      console.error("Error submitting proposal:", error);
      throw error;
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!window.confirm("Are you sure you want to decline this request?")) return;
    
    try {
      await supabase.from("project_requests").update({ status: "rejected" }).eq("id", requestId);
      alert("Request declined.");
      await loadDashboard(false);
    } catch (error) {
      console.error("Error declining request:", error);
      alert("Failed to decline request. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'funded': return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">Escrow Funded</span>;
      case 'in_progress': return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">In Progress</span>;
      case 'submitted': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">Under Review</span>;
      case 'completed':
      case 'released': return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">Completed</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Authenticating Workspace...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW A: THE ONBOARDING WIZARD
  // ==========================================
  if (!isFreelancer && user) {
    return (
      <ExpertOnboardingWizard
        userId={user.id}
        initialProfile={onboardingProfileSeed}
        onComplete={() => {
          void handleOnboardingComplete();
        }}
      />
    );
  }

  // ==========================================
  // VIEW B: THE MASTER DASHBOARD (BUILDER OS)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-blue-200 selection:text-blue-900">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 sticky top-0 md:h-screen overflow-y-auto hidden-scrollbar z-40">

        {/* User Identity */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Operating Expert</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden relative shrink-0 border border-slate-700 flex items-center justify-center">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} fill sizes="40px" className="object-cover" alt="User" priority />
              ) : (
                <span className="text-slate-400 text-sm font-bold">{profile?.full_name?.charAt(0) || '?'}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-white truncate">{profile?.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-green-400">Available</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-2">Workspace</p>
          <button onClick={() => setActiveView('overview')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Overview} Dashboard
          </button>
          <button onClick={() => setActiveView('projects')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'projects' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Projects} My Clients
          </button>
          <button onClick={() => setActiveView('services')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'services' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Assets} My Services
          </button>
          <button onClick={() => setActiveView('portfolio')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'portfolio' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Projects} Portfolio
          </button>
          <button onClick={() => setActiveView('requests')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'requests' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Messages} Custom Requests
          </button>
          <button onClick={() => router.push('/builder/inbox')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'messages' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Messages} Inbox
          </button>

          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-6">Inventory & Sales</p>
          <button onClick={() => setActiveView('services')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'services' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Assets} AI Solutions
          </button>
          <button onClick={() => setActiveView('finances')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'finances' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Finances} Earnings Ledger
          </button>
          <Link href="/builder/recognition" className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white">
            {Icons.Profile} Recognition
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1 mt-auto">
          <Link href="/profile/me" className="w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white">
            {Icons.Profile} Edit Public Profile
          </Link>
        </div>
      </aside>

      {/* DASHBOARD MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">

          {/* =========================================================
              VIEW 1: OVERVIEW
             ========================================================= */}
          {activeView === 'overview' && (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Expert Command Center</h1>
                  <p className="text-sm font-medium text-slate-500 mt-1">Manage active contracts, track earnings, and publish AI Solutions.</p>
                </div>
                <button onClick={() => setActiveView('services')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Publish AI Solution
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Earnings</p>
                  <p className="text-3xl font-black text-green-600">${stats.netEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Locked in Escrow</p>
                  <p className="text-3xl font-black text-slate-900">${stats.pendingEscrows.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active Projects</p>
                  <p className="text-3xl font-black text-blue-600">{stats.activeCollabs}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Solution Sales</p>
                  <p className="text-3xl font-black text-purple-600">{stats.componentSales}</p>
                </div>
              </div>

              <div className="mb-10">
                <BuilderRecognitionPanel />
              </div>

              {/* Recent Clients Section */}
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Active Contracts
              </h2>
              {recentCollabs.filter((collab) => isActiveCollab(collab.status)).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active contracts found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recentCollabs.filter((collab) => isActiveCollab(collab.status)).slice(0, 4).map(collab => (
                    <div key={collab.id} onClick={() => router.push(`/collab/${collab.id}`)} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col" role="button" tabIndex={0}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 relative flex items-center justify-center">
                            {collab.profiles?.avatar_url ? (
                              <Image src={collab.profiles.avatar_url} fill sizes="32px" className="object-cover" alt="Buyer" />
                            ) : (
                              <span className="text-slate-400 text-xs font-bold">{getDisplayNameInitials(collab.profiles?.full_name)}</span>
                            )}
                          </div>
                          <h3 className="text-lg font-black text-slate-900 line-clamp-1">{collab.title}</h3>
                        </div>
                        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest shrink-0">{collab.status.replace('_', ' ')}</span>
                      </div>
                      <div className="mt-auto flex justify-between items-end border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Escrow: <span className="text-slate-900 font-black">${collab.escrow_amount_usd}</span></p>
                        <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest">Enter Room →</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* =========================================================
              VIEW 2: CLIENT LEDGER (PROJECTS)
             ========================================================= */}
          {activeView === 'projects' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Client Ledger</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Manage active contracts, deliver milestones, and secure escrow payouts.</p>
                </div>
              </div>

              {/* Tab Filters */}
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                {['all', 'active', 'completed'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProjectTabFilter(tab as any)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${projectTabFilter === tab ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    {tab === 'active' ? 'In Progress' : tab}
                  </button>
                ))}
              </div>

              {recentCollabs.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">No client contracts yet.</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6">When a buyer hires you, the secure escrow contract will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recentCollabs
                    .filter(c => {
                      if (projectTabFilter === 'active') return isActiveCollab(c.status);
                      if (projectTabFilter === 'completed') return isCompletedCollab(c.status);
                      return true;
                    })
                    .map(collab => (
                      <div key={collab.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col">

                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative shrink-0 border border-slate-200">
                              <Image src={collab.profiles?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100'} fill sizes="40px" className="object-cover" alt="Buyer" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Enterprise Client</p>
                              <p className="text-sm font-black text-slate-900 leading-tight">{collab.profiles?.full_name}</p>
                            </div>
                          </div>
                          {getStatusBadge(collab.status)}
                        </div>

                        <div className="mb-6 flex-1">
                          <h3 className="text-lg font-black text-slate-900 line-clamp-1 mb-1">{collab.title}</h3>
                          <p className="text-xs font-medium text-slate-500 line-clamp-2">{collab.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secured Escrow</p>
                            <p className="text-lg font-black text-slate-900">${Number(collab.escrow_amount_usd).toLocaleString()}</p>
                          </div>
                          <button onClick={() => router.push(`/collab/${collab.id}`)} className="bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                            Enter Workspace
                          </button>
                        </div>

                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'services' && user && (
            <ServiceManager builderId={user.id} />
          )}

          {activeView === 'portfolio' && user && (
            <PortfolioManager builderId={user.id} />
          )}

          {activeView === 'requests' && (
            <div className="animate-in fade-in duration-300 space-y-4">
              <h2 className="text-3xl font-black text-slate-900">Custom Project Requests</h2>
              {customRequests.length === 0 ? (
                <p className="text-sm text-slate-500">No custom requests yet.</p>
              ) : (
                customRequests.map((req: any) => (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-black text-slate-900 text-lg">{req.title}</p>
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                            req.payment_type === 'milestone_payment' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {req.payment_type === 'milestone_payment' ? 'Milestone Payment' : 'Single Payment'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-1">{req.buyer?.full_name} · {req.status}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{req.description}</p>
                        {req.payment_type === 'single_payment' && req.budget_usd && (
                          <p className="text-sm font-bold text-slate-900 mt-2">Budget: ${req.budget_usd.toLocaleString()}</p>
                        )}
                        {req.payment_type === 'milestone_payment' && req.budget_usd && (
                          <p className="text-sm font-bold text-slate-900 mt-2">Total Milestone Budget: ${req.budget_usd.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      {req.conversation_id ? (
                        <button
                          onClick={() => router.push(`/builder/inbox?conversation=${req.conversation_id}`)}
                          className="flex-1 bg-slate-900 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                          Open in Chat
                        </button>
                      ) : (
                        <p className="text-xs font-bold text-slate-400">No conversation linked</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* =========================================================
              VIEW 4: FINANCES (Earnings Ledger)
             ========================================================= */}
          {activeView === 'finances' && <EarningsLedgerPanel />}

        </div>
      </main>

      {/* Negotiation Modal */}
      {selectedRequest && (
        <NegotiationModal
          isOpen={negotiationModalOpen}
          onClose={() => {
            setNegotiationModalOpen(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          onSubmit={handleNegotiationSubmit}
        />
      )}
    </div>
  );
}