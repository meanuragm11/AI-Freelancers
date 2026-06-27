"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';

export default function SavedExperts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savedExperts, setSavedExperts] = useState<any[]>([]);
  const [activeCollection, setActiveCollection] = useState('All');

  useEffect(() => {
    async function fetchSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data, error } = await supabase
        .from('saved_experts')
        .select(`
          id,
          collection_name,
          saved_at,
          profiles!expert_id (id, full_name, avatar_url, headline, base_price_usd, reputation_score)
        `)
        .eq('buyer_id', user.id)
        .order('saved_at', { ascending: false });

      if (data && !error) setSavedExperts(data);
      setLoading(false);
    }
    fetchSaved();
  }, [router]);

  const collections = ['All', ...Array.from(new Set(savedExperts.map(s => s.collection_name).filter(Boolean)))];
  const filteredExperts = activeCollection === 'All' ? savedExperts : savedExperts.filter(s => s.collection_name === activeCollection);

  const removeExpert = async (id: string) => {
    setSavedExperts(prev => prev.filter(s => s.id !== id)); // Optimistic UI
    await supabase.from('saved_experts').delete().eq('id', id);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading Rolodex...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <Link href="/buyer/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Saved Experts</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Organize and bookmark top AI talent for future collaborations.</p>
          </div>
          <Link href="/buyer/discover" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors flex items-center gap-2">
             Discover Talent
          </Link>
        </div>

        {savedExperts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Your rolodex is empty.</h3>
            <p className="text-sm font-medium text-slate-500 mb-6">Bookmark experts from the marketplace to build your bench of talent.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
              {collections.map((col: string) => (
                <button key={col} onClick={() => setActiveCollection(col)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCollection === col ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                  {col}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredExperts.map(saved => {
                const expert = saved.profiles;
                return (
                  <div key={saved.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex flex-col relative group">
                    
                    <button onClick={() => removeExpert(saved.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-white p-1 rounded-full shadow-sm border border-slate-100" title="Remove Bookmark">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                    </button>

                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden relative mb-3 border-4 border-white shadow-sm">
                        <Image src={expert.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200'} fill sizes="80px" className="object-cover" alt={expert.full_name} />
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-tight cursor-pointer hover:text-blue-600" onClick={() => router.push(`/profile/${expert.id}`)}>{expert.full_name}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 line-clamp-1">{expert.headline}</p>
                    </div>

                    <div className="flex justify-between items-center mb-6 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                       <div>
                         <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Base Rate</p>
                         <p className="text-sm font-black text-slate-900">${expert.base_price_usd}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Reputation</p>
                         <p className="text-sm font-black text-amber-500 flex items-center justify-end gap-1">
                           ★ {(expert.reputation_score / 20).toFixed(1)}
                         </p>
                       </div>
                    </div>

                    <div className="mt-auto">
                      <button onClick={() => router.push(`/buyer/collabs/new?builderId=${expert.id}`)} className="w-full bg-slate-900 hover:bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                        Hire Expert
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}