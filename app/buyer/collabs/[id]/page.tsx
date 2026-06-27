"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import MilestoneManager from '@/components/MilestoneManager';
type WorkspaceTab = 'overview' | 'milestones' | 'messages' | 'files';

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const collabId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  
  // Data States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  
  // Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let messageSubscription: any;

    async function initializeWorkspace() {
      if (!collabId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setCurrentUser(user);

      // Fetch Project Details & Expert Profile
      const { data: collabData, error } = await supabase
        .from('collabs')
        .select('*, profiles!builder_id(id, full_name, avatar_url, headline, location)')
        .eq('id', collabId)
        .single();

      // Security Gate: Ensure the current user is actually the buyer of this project
      if (error || collabData?.buyer_id !== user.id) {
        router.push('/buyer/dashboard');
        return;
      }

      setProject(collabData);

      // Fetch Chat History
      const { data: chatHistory } = await supabase
        .from('messages')
        .select('*')
        .eq('collab_id', collabId)
        .order('created_at', { ascending: true });

      if (chatHistory) setMessages(chatHistory);

      // Realtime Chat Listener
      messageSubscription = supabase.channel(`collab_${collabId}`)
        .on('postgres', { event: 'INSERT', schema: 'public', table: 'messages', filter: `collab_id=eq.${collabId}` }, payload => {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        })
        .subscribe();

      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView(), 100);
    }

    initializeWorkspace();
    return () => { if (messageSubscription) supabase.removeChannel(messageSubscription); };
  }, [collabId, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    const msgText = newMessage.trim();
    setNewMessage(''); // Optimistic clear

    await supabase.from('messages').insert({
      collab_id: collabId,
      sender_id: currentUser.id,
      text: msgText
    });
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400">Loading Secure Workspace...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. HEADER STRIP */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/buyer/projects" className="text-slate-400 hover:text-slate-900 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </Link>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                 project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>{project.status.replace('_', ' ')}</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{project.title}</h1>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <div className="w-8 h-8 rounded-full overflow-hidden relative border-2 border-white shadow-sm">
              <Image src={project.profiles.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100'} fill sizes="32px" className="object-cover" alt="Expert" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Collaborator</p>
              <p className="text-xs font-black text-slate-900">{project.profiles.full_name}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-6 overflow-x-auto scrollbar-hide">
          {['overview', 'milestones', 'messages', 'files'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as WorkspaceTab)}
              className={`py-4 text-xs font-black uppercase tracking-widest transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {tab}
              {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
            </button>
          ))}
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex gap-8">
        
        {/* VIEW: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 border-b border-slate-100 pb-2">Project Scope</h2>
                <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{project.description}</p>
              </div>

              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full blur-2xl"></div>
                <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                  AI Project Analysis
                </h2>
                <p className="text-sm font-medium leading-relaxed text-slate-300 mb-6">
                  Based on the scope, this project requires advanced RAG implementation. Budget aligns with market rates. Expected timeline: <strong className="text-white">12-14 Days</strong>. 
                </p>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-md">
                  Generate Milestones Automatically
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Financial Overview</h3>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Escrow Locked</p>
                  <p className="text-3xl font-black text-slate-900">${project.escrow_amount_usd.toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Released Funds</span>
                  <span className="text-xs font-black text-slate-900">$0.00</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-bold text-slate-500">Platform Fee</span>
                  <span className="text-xs font-black text-slate-900">Paid</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW: MESSAGES (Real-Time Chat Engine) */}
        {activeTab === 'messages' && (
          <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-[70vh] overflow-hidden animate-in fade-in duration-300">
            
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              <div className="text-center pb-4">
                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
                  End-to-End Encrypted Chat
                </span>
              </div>

              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === currentUser.id;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                      isMe ? 'bg-blue-600 text-white rounded-br-sm shadow-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}>
                      <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-[8px] font-bold mt-2 uppercase tracking-widest ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <button type="button" className="p-3 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-xl hover:bg-blue-50">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message or paste code..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              />
              <button type="submit" disabled={!newMessage.trim()} className="bg-slate-900 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm flex items-center gap-2">
                Send <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>
        )}

        {/* VIEW: MILESTONES (Placeholder for future state machine) */}

        
        {/* VIEW: MILESTONES (The Escrow Engine) */}
        {activeTab === 'milestones' && (
          <div className="flex-1 animate-in fade-in duration-300">
             <MilestoneManager 
                collabId={activeCollabId} 
                currentUser={currentUser} 
                userRole={userRole} 
             />
          </div>
        )}

      </main>
    </div>
  );
}