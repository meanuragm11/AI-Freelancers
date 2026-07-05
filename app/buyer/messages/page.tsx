"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MessagingInterface from '@/components/MessagingInterface';
import Link from 'next/link';

function BuyerMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setCurrentUser(user);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="mb-8">
          <Link href="/buyer/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Secure Communications</h1>
        </div>
        <MessagingInterface currentUser={currentUser} userRole="buyer" initialConversationId={conversationId} />
      </div>
    </div>
  );
}

export default function BuyerMessages() {
  return (
    <Suspense fallback={null}>
      <BuyerMessagesContent />
    </Suspense>
  );
}