"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from '@/components/RemoteImage';
import Link from 'next/link';
import MilestoneManager from '@/components/MilestoneManager';
import DisputeCenter from '@/components/DisputeCenter';
import DisputeModal from '@/components/DisputeModal';
import ReviewModal from '@/components/ReviewModal';
import RefundPanel from '@/components/RefundPanel';
import {
  formatProfileDisplayName,
  getDisplayNameInitials,
  resolveDisplayName,
} from '@/lib/display/formatDisplayName';
import { isActiveDisputeStatus } from '@/lib/disputes/constants';

type WorkspaceTab = 'overview' | 'milestones' | 'files' | 'disputes' | 'refunds';

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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showManageDisputeModal, setShowManageDisputeModal] = useState(false);
  const [hasActiveDispute, setHasActiveDispute] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<{ messageFiles: any[]; deliverables: any[]; revisions: any[] }>({
    messageFiles: [],
    deliverables: [],
    revisions: [],
  });

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
          buyer:profiles_public!buyer_id(id, full_name, avatar_url, headline),
          builder:profiles_public!builder_id(id, full_name, avatar_url, headline)
        `)
        .eq('id', collabId)
        .single();

      if (error || !collabData) {
        setWorkspaceError("Workspace not found or access denied.");
        router.push('/');
        return;
      }

      if (collabData.project_request_id) {
        const { data: projectRequest } = await supabase
          .from('project_requests')
          .select('payment_type, agreed_amount_usd, budget_usd')
          .eq('id', collabData.project_request_id)
          .maybeSingle();

        if (projectRequest?.payment_type === 'milestone_payment') {
          collabData.payment_type = 'milestone_based';
        }
        if (!collabData.escrow_amount_usd) {
          collabData.escrow_amount_usd =
            projectRequest?.agreed_amount_usd ?? projectRequest?.budget_usd ?? collabData.fixed_price_usd;
        }
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

      const disputeRes = await fetch(`/api/disputes?collabId=${encodeURIComponent(collabId)}`);
      const disputeData = await disputeRes.json().catch(() => ({}));
      if (disputeRes.ok) {
        const active = Boolean(disputeData.dispute && isActiveDisputeStatus(disputeData.dispute.status));
        setHasActiveDispute(active);
      }
    }

    loadWorkspace();
  }, [collabId, router]);

  const handleMessageRoute = () => {
    // Routes to the respective inbox
    if (userRole === 'buyer') router.push('/buyer/messages');
    else router.push('/builder/inbox');
  };

  const loadWorkspaceFiles = async () => {
    setFilesLoading(true);
    setWorkspaceError(null);
    try {
      const response = await fetch(`/api/collabs/${collabId}/files`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load workspace files');
      setWorkspaceFiles({
        messageFiles: result.messageFiles || [],
        deliverables: result.deliverables || [],
        revisions: result.revisions || [],
      });
    } catch (error: unknown) {
      setWorkspaceError(error instanceof Error ? error.message : 'Failed to load workspace files');
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'files' && collabId) {
      void loadWorkspaceFiles();
    }
  }, [activeTab, collabId]);

  const completeProject = async () => {
    setCompletionLoading(true);
    setWorkspaceError(null);
    try {
      const response = await fetch(`/api/collabs/${collabId}/complete`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Project completion failed');
      setCollab((prev: any) => ({ ...prev, status: 'completed' }));
    } catch (error: unknown) {
      setWorkspaceError(error instanceof Error ? error.message : 'Project completion failed');
    } finally {
      setCompletionLoading(false);
    }
  };

  const openWorkspaceFile = async (file: any) => {
    setWorkspaceError(null);
    try {
      if (file.mode === 'private') {
        const response = await fetch(`/api/collabs/${collabId}/files/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: file.bucket, path: file.path, fileName: file.fileName }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not authorize file');
        window.open(result.url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (file.url) {
        window.open(file.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error: unknown) {
      setWorkspaceError(error instanceof Error ? error.message : 'Could not open file');
    }
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
  const counterpartyDisplayName = formatProfileDisplayName(counterparty);
  const counterpartyInitials = getDisplayNameInitials(resolveDisplayName(counterparty));

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
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {collab.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${collab.payment_type === 'milestone_based' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                  {collab.payment_type === 'milestone_based' ? 'Milestone-Based' : 'Single Payment'}
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
              <button
                onClick={() => {
                  if (hasActiveDispute) return;
                  void completeProject();
                }}
                disabled={hasActiveDispute || completionLoading}
                title={hasActiveDispute ? 'Contract completion is paused while a dispute is active.' : undefined}
                className="flex-1 md:flex-none bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 disabled:text-slate-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors"
              >
                {hasActiveDispute ? 'Completion Paused' : completionLoading ? 'Completing...' : 'Complete Project'}
              </button>
            )}
            {userRole === 'buyer' && isCompleted && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors"
              >
                Leave Review
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
              <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 relative border border-slate-200 flex items-center justify-center">
                {counterparty?.avatar_url ? (
                  <Image src={counterparty.avatar_url} fill sizes="56px" className="object-cover" alt="Profile" />
                ) : (
                  <span className="text-slate-400 text-lg font-bold">{counterpartyInitials}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black text-slate-900 truncate">{counterpartyDisplayName}</p>
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
            {userRole === 'buyer' && (
              <button onClick={() => setActiveTab('disputes')} className={`text-left px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'disputes' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Raise Dispute
                {hasActiveDispute && <span className="ml-auto w-2 h-2 rounded-full bg-rose-500" />}
              </button>
            )}
            {userRole === 'builder' && (
              <button onClick={() => setActiveTab('disputes')} className={`text-left px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'disputes' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Dispute Center
                {hasActiveDispute && <span className="ml-auto w-2 h-2 rounded-full bg-rose-500" />}
              </button>
            )}
            <button onClick={() => setActiveTab('refunds')} className={`text-left px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'refunds' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a4 4 0 00-8 0v2M5 9h14l-1 12H6L5 9z" /></svg>
              Refunds
            </button>
          </nav>
        </aside>

        {/* Main Working Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {workspaceError && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-bold text-rose-700">
                {workspaceError}
              </div>
            )}
            
            {/* TAB 1: MILESTONES (The Engine) */}
            {activeTab === 'milestones' && (
              <MilestoneManager 
                collabId={collab.id} 
                userRole={userRole!}
                hasActiveDispute={hasActiveDispute}
                onRaiseDispute={userRole === 'buyer' ? () => setShowDisputeModal(true) : undefined}
                onManageDispute={() => setShowManageDisputeModal(true)}
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
                      {collab.description || collab.project_description || 'No project brief was provided.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contract Initiated</p>
                      <p className="text-sm font-black text-slate-900">{new Date(collab.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Initial Escrow Seed</p>
                      <p className="text-sm font-black text-blue-600">${Number(collab.escrow_amount_usd ?? collab.fixed_price_usd ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SHARED FILES */}
            {activeTab === 'files' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Shared Files & Deliverables</h2>
                    <p className="text-xs font-medium text-slate-500 mt-1">Message attachments, submitted deliverables, and revision requests for this workspace.</p>
                  </div>
                  <button onClick={loadWorkspaceFiles} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Refresh
                  </button>
                </div>

                {filesLoading ? (
                  <div className="py-12 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading workspace files...</div>
                ) : workspaceFiles.messageFiles.length === 0 && workspaceFiles.deliverables.length === 0 && workspaceFiles.revisions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                    <h3 className="text-sm font-black text-slate-900">No files or deliverables yet</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Uploads and milestone submissions will appear here after they are shared.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Deliverables</h3>
                      <div className="space-y-3">
                        {workspaceFiles.deliverables.map((deliverable) => (
                          <div key={deliverable.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-black text-slate-900">{deliverable.title}</p>
                                <p className="text-xs font-medium text-slate-500 mt-1">{deliverable.description || 'No description provided.'}</p>
                              </div>
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-600">{deliverable.status}</span>
                            </div>
                            {deliverable.revision_notes && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">{deliverable.revision_notes}</p>}
                            {deliverable.attachments?.length > 0 && (
                              <div className="mt-3 grid grid-cols-1 gap-2">
                                {deliverable.attachments.map((file: { url: string; name: string; type?: string; size?: number }) => (
                                  <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50">
                                    {file.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Message Attachments</h3>
                      <div className="space-y-3">
                        {workspaceFiles.messageFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">{file.fileName}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{file.fileType} · {new Date(file.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => openWorkspaceFile(file)} className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600">
                              Open
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Revision Requests</h3>
                      <div className="space-y-3">
                        {workspaceFiles.revisions.map((revision) => (
                          <div key={revision.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-black text-amber-950">{revision.reason}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mt-1">{revision.status} · {new Date(revision.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'disputes' && user && (
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm animate-in fade-in duration-300 min-h-[600px] flex flex-col overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-8 py-6">
                  <h2 className="text-xl font-black text-slate-900">{userRole === 'buyer' ? 'Raise Dispute' : 'Dispute Center'}</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {userRole === 'buyer'
                      ? 'Open a dispute, upload evidence, and track resolution status. Escrow will be frozen while active.'
                      : 'View active disputes, respond to complaints, upload evidence, and track resolution status.'}
                  </p>
                </div>
                <DisputeCenter
                  collabId={collab.id}
                  currentUser={user}
                  userRole={userRole!}
                  showOpenDisputeForm={userRole === 'buyer'}
                  onDisputeChanged={setHasActiveDispute}
                  variant="embedded"
                />
              </div>
            )}

            {activeTab === 'refunds' && user && (
              <div className="animate-in fade-in duration-300">
                <RefundPanel collabId={collab.id} userRole={userRole!} />
              </div>
            )}
          </div>
      </div>

      {showDisputeModal && user && userRole === 'buyer' && (
        <DisputeModal
          collabId={collab.id}
          currentUser={user}
          userRole="buyer"
          onClose={() => setShowDisputeModal(false)}
          onDisputeChanged={setHasActiveDispute}
        />
      )}

      {showManageDisputeModal && user && (
        <DisputeModal
          collabId={collab.id}
          currentUser={user}
          userRole={userRole!}
          title="Manage Dispute"
          subtitle="Review status, add evidence, or withdraw the dispute."
          showOpenDisputeForm={false}
          onClose={() => setShowManageDisputeModal(false)}
          onDisputeChanged={setHasActiveDispute}
        />
      )}

      {/* REVIEW & REPUTATION MODAL */}
      {showReviewModal && (
        <ReviewModal
          collabId={collab.id}
          builderId={collab.builder_id}
          serviceId={collab.service_id}
          builderName={counterpartyDisplayName || 'the expert'}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            setShowReviewModal(false);
          }}
        />
      )}

    </div>
  );
}