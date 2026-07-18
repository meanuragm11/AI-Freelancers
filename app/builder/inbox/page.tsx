"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import MessagingInterface from '@/components/MessagingInterface';

function BuilderInboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error || !currentUser) {
        router.push('/auth');
        return;
      }
      
      setUser(currentUser);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Decrypting Secure Inbox...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/builder/dashboard" 
              className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">Inbox</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Encrypted Communication</p>
              </div>
            </div>
          </div>
          
          <button onClick={() => router.push('/builder/dashboard')} className="hidden md:block text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* MESSAGING ENGINE MOUNT POINT */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
        <MessagingInterface 
          currentUser={user} 
          userRole="builder"
          initialConversationId={conversationId}
        />
      </div>
      
    </div>
  );
}

export default function BuilderInboxPage() {
  return (
    <Suspense fallback={null}>
      <BuilderInboxContent />
    </Suspense>
  );
}