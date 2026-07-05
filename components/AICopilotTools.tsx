"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AICopilotToolsProps {
  collabId: string;
  currentUser: any;
  userRole: 'buyer' | 'builder';
}

export default function AICopilotTools({ collabId, currentUser, userRole }: AICopilotToolsProps) {
  const [loading, setLoading] = useState(false);

  // Dispute State
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeStatus, setDisputeStatus] = useState<any>(null);

  useEffect(() => {
    fetchDisputeStatus();
  }, [collabId]);

  const fetchDisputeStatus = async () => {
    const { data, error } = await supabase
      .from('collabs')
      .select('status, escrow_amount_usd')
      .eq('id', collabId)
      .single();
    if (data) setDisputeStatus(data);
  };

  // --- ESCROW DISPUTE RESOLUTION MITIGATION ---
  const triggerDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason || !disputeDescription.trim()) return;
    setLoading(true);

    // Freezes the collaboration contract instantly, putting it into a locked dispute state
    const { error } = await supabase
      .from('collabs')
      .update({ status: 'disputed' })
      .eq('id', collabId);

    if (error) {
      alert("Failed to lock escrow vault.");
    } else {
      alert("Escrow vault locked. Platform arbitration team notified. Funds are securely frozen.");
      fetchDisputeStatus();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm h-full flex flex-col overflow-hidden font-sans">
      
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">🛡️ Escrow Dispute Center</h3>
        <p className="text-xs font-medium text-slate-500 mt-0.5">Freeze vault assets if deliverables breach original technical specs.</p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        
        {/* ESCROW DISPUTE LAYER */}
          <div className="space-y-6 animate-in fade-in duration-300">
            {disputeStatus?.status === 'disputed' ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
                 <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
                 <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Escrow Locked</h4>
                 <p className="text-xs font-medium text-rose-700 mt-1 leading-relaxed">The total contract vault amount (${disputeStatus.escrow_amount_usd}) has been strictly locked. An internal technical auditor has been assigned to verify files and milestones.</p>
              </div>
            ) : (
              <form onSubmit={triggerDispute} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Primary Reason for Breach</label>
                  <select 
                    value={disputeReason} 
                    onChange={e => setDisputeReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none cursor-pointer"
                  >
                    <option value="">Select reason...</option>
                    <option value="quality">Deliverable does not meet technical guidelines</option>
                    <option value="timeline">Critical milestone deadline significantly missed</option>
                    <option value="communication">No contact / Unresponsive partner</option>
                    <option value="scope">Unwarranted addition to baseline criteria</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Evidence & Timeline Chronology</label>
                  <textarea 
                    required
                    rows={5}
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    placeholder="Provide a granular timeline of milestones missed, or code inconsistencies compared to initial requirements specification..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-[11px] font-medium text-rose-700 leading-normal">
                  ⚠️ <strong>Notice:</strong> Triggering a dispute freezes operations immediately. Platforms funds remain strictly locked in the vault until both parties agree or arbitration finishes.
                </div>

                <button type="submit" disabled={loading || !disputeReason} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm disabled:opacity-50">
                  {loading ? 'Securing Vault...' : 'Freeze Vault & Initialize Dispute'}
                </button>
              </form>
            )}
          </div>

      </div>
    </div>
  );
}