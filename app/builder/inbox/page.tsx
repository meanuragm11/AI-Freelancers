"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MessagingInterface from '@/components/MessagingInterface';
import Link from 'next/link';

export default function BuilderInbox() {
  const router = useRouter();
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
          <Link href="/builder/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back to Workspace
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Client Inbox</h1>
        </div>
        <MessagingInterface currentUser={currentUser} userRole="builder" />
      </div>
    </div>
  );
}