"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LeadInboxPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [activeLead, setActiveLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('leads')
          .select('*, listings(title)')
          .eq('builder_id', user.id)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setLeads(data);
          setActiveLead(data[0]);
        }
      }
      setLoading(false);
    }
    fetchLeads();
  }, []);

  // Update lead status to 'read' when clicked
  const handleLeadClick = async (lead: any) => {
    setActiveLead(lead);
    if (lead.status === 'unread') {
      const updatedLeads = leads.map(l => l.id === lead.id ? { ...l, status: 'read' } : l);
      setLeads(updatedLeads);
      
      await supabase
        .from('leads')
        .update({ status: 'read' })
        .eq('id', lead.id);
    }
  };

  if (loading) {
    return <div className="p-10 animate-pulse text-slate-400 font-bold tracking-widest uppercase text-sm">Syncing Secure Inbox...</div>;
  }

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="p-6 md:p-10 border-b border-slate-200 shrink-0">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lead Inbox</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Negotiate custom builds and enterprise contracts directly with buyers.</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left List */}
        <div className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto">
          {leads.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">No enterprise leads yet.</div>
          ) : (
            leads.map((lead) => (
              <div 
                key={lead.id} 
                onClick={() => handleLeadClick(lead)}
                className={`p-6 border-b border-slate-100 cursor-pointer transition-colors ${activeLead?.id === lead.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`text-sm ${lead.status === 'unread' ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                    {lead.buyer_name}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Regarding: {lead.listings?.title || 'Custom Build'}</p>
                <p className={`text-sm line-clamp-2 ${lead.status === 'unread' ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                  {lead.message}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Right Detail Pane */}
        <div className="w-2/3 bg-slate-50 p-10 flex flex-col relative overflow-y-auto">
          {activeLead ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-1">{activeLead.buyer_name}</h2>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{activeLead.buyer_email}</p>
                </div>
                <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  Enterprise Inquiry
                </span>
              </div>
              <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                {activeLead.message}
              </p>
              
              <div className="mt-10 pt-6 border-t border-slate-100 flex gap-4">
                <a href={`mailto:${activeLead.buyer_email}`} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-blue-700 transition-colors">
                  Reply via Email
                </a>
                <button className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors">
                  Archive Lead
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm">
              Select a lead to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}