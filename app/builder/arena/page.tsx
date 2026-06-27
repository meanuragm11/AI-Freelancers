"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface ArenaBuilder {
  id: string;
  full_name: string;
  headline: string;
  avatar_url?: string;
  components_count: number;
  rank: number;
}

// Elite Mock Data with dynamic profile images and list photos
const MOCK_LEADERBOARD: ArenaBuilder[] = [
  { id: '1', full_name: "Sarah J.", headline: "Senior RAG Architect", components_count: 47, rank: 1, avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: '2', full_name: "Alex M.", headline: "Autonomous Agents Engineer", components_count: 38, rank: 2, avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: '3', full_name: "David C.", headline: "Vector Database Specialist", components_count: 31, rank: 3, avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: '4', full_name: "Priya K.", headline: "AI UI/UX Integrator", components_count: 24, rank: 4, avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
  { id: '5', full_name: "James L.", headline: "LLM Fine-Tuning Expert", components_count: 19, rank: 5, avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150" },
  { id: '6', full_name: "Elena R.", headline: "Computer Vision Engineer", components_count: 15, rank: 6, avatar_url: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150" },
  { id: '7', full_name: "Marcus T.", headline: "Data Engineering Lead", components_count: 12, rank: 7 }, // No photo fallback
  { id: '8', full_name: "Wei C.", headline: "Prompt Engineer", components_count: 9, rank: 8, avatar_url: "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=150" },
];

export default function ArenaLeaderboard() {
  const [builders, setBuilders] = useState<ArenaBuilder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setTimeout(() => {
        setBuilders(MOCK_LEADERBOARD);
        setLoading(false);
      }, 500); 
    }

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Compiling Mesh Ranks...</p>
      </div>
    );
  }

  const topThree = builders.slice(0, 3);
  const theRest = builders.slice(3);

  // Helper for list-item fallback graphics
  const renderFallbackAvatar = (name: string, sizeClass = 'w-12 h-12 text-lg') => (
    <div className={`rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center ${sizeClass}`}>
      <span className="font-black text-slate-400 uppercase">
        {name?.charAt(0) || 'E'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Header Section */}
      <div className="bg-slate-900 pt-20 pb-48 px-6 text-center relative overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-[10%] right-[20%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Live Global Rankings
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">The Arena</h1>
          <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-2xl mx-auto">
            Rankings are determined by the total volume of verified AI components deployed to the Zelance Mesh. Performance is reality.
          </p>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 -mt-28 relative z-20">
        
        {/* THE PODIUM (Top 3) */}
        {topThree.length === 3 && (
          <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-6 md:gap-8 mb-20 px-2">
            
            {/* Rank 2 (Silver) - Left */}
            <div className="order-2 md:order-1 w-full md:w-1/3 max-w-[280px] bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_10px_40px_-15px_rgba(148,163,184,0.3)] flex flex-col items-center text-center transform md:-translate-y-4 hover:-translate-y-6 transition-all duration-300 group">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-400 text-white rounded-full flex items-center justify-center text-sm font-black mb-5 shadow-inner border border-slate-200">#2</div>
              <Link href={`/profile/${topThree[1].id}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                <div className="w-20 h-20 rounded-full mb-4 relative p-1 bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm">
                  {topThree[1].avatar_url ? (
                    <img src={topThree[1].avatar_url} alt="Rank 2" className="w-full h-full object-cover rounded-full border-2 border-white" />
                  ) : (
                    renderFallbackAvatar(topThree[1].full_name, 'w-full h-full text-xl bg-white')
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{topThree[1].full_name}</h3>
              </Link>
              <p className="text-xs font-bold text-slate-500 mb-6">{topThree[1].headline}</p>
              <div className="w-full border-t border-slate-100 pt-5 mt-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Components Deployed</p>
                <p className="text-3xl font-black text-slate-700">{topThree[1].components_count}</p>
              </div>
            </div>

            {/* Rank 1 (Gold) - Center */}
            <div className="order-1 md:order-2 w-full md:w-1/3 max-w-[320px] bg-white border-2 border-amber-300 rounded-3xl p-8 shadow-[0_15px_50px_-10px_rgba(245,158,11,0.25)] flex flex-col items-center text-center relative z-10 transform md:-translate-y-12 hover:-translate-y-14 transition-all duration-300 group">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border-2 border-white whitespace-nowrap">
                👑 Grandmaster
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-amber-500 text-white rounded-full flex items-center justify-center text-lg font-black mb-5 mt-2 shadow-inner border border-amber-200">#1</div>
              <Link href={`/profile/${topThree[0].id}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                <div className="w-28 h-28 rounded-full mb-5 relative p-1 bg-gradient-to-br from-amber-300 to-amber-500 shadow-md">
                  {topThree[0].avatar_url ? (
                    <img src={topThree[0].avatar_url} alt="Rank 1" className="w-full h-full object-cover rounded-full border-4 border-white" />
                  ) : (
                    renderFallbackAvatar(topThree[0].full_name, 'w-full h-full text-3xl bg-white')
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">{topThree[0].full_name}</h3>
              </Link>
              <p className="text-xs font-bold text-amber-600 mb-8">{topThree[0].headline}</p>
              <div className="w-full bg-amber-50/50 border border-amber-100/50 rounded-2xl py-5 mt-auto">
                <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest mb-1">Components Deployed</p>
                <p className="text-4xl font-black text-amber-500">{topThree[0].components_count}</p>
              </div>
            </div>

            {/* Rank 3 (Bronze) - Right */}
            <div className="order-3 md:order-3 w-full md:w-1/3 max-w-[280px] bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_10px_40px_-15px_rgba(249,115,22,0.15)] flex flex-col items-center text-center transform md:translate-y-0 hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-300 to-orange-400 text-white rounded-full flex items-center justify-center text-sm font-black mb-5 shadow-inner border border-orange-200">#3</div>
              <Link href={`/profile/${topThree[2].id}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                <div className="w-20 h-20 rounded-full mb-4 relative p-1 bg-gradient-to-br from-orange-200 to-orange-300 shadow-sm">
                  {topThree[2].avatar_url ? (
                    <img src={topThree[2].avatar_url} alt="Rank 3" className="w-full h-full object-cover rounded-full border-2 border-white" />
                  ) : (
                    renderFallbackAvatar(topThree[2].full_name, 'w-full h-full text-xl bg-white')
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-orange-600 transition-colors">{topThree[2].full_name}</h3>
              </Link>
              <p className="text-xs font-bold text-slate-500 mb-6">{topThree[2].headline}</p>
              <div className="w-full border-t border-slate-100 pt-5 mt-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Components Deployed</p>
                <p className="text-3xl font-black text-slate-700">{topThree[2].components_count}</p>
              </div>
            </div>

          </div>
        )}

        {/* THE LIST (Rank 4 and below) */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-lg shadow-slate-200/40 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Global Contender List</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ranks 4 - {builders.length}</span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {theRest.map((builder) => (
              <div key={builder.id} className="p-6 sm:px-8 flex items-center gap-5 md:gap-8 hover:bg-slate-50/80 transition-colors group">
                
                {/* Rank Number */}
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors flex-shrink-0">
                  #{builder.rank}
                </div>

                {/* Profile Link Wrapper (Photo & Info) */}
                <Link href={`/profile/${builder.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity flex-1 min-w-0">
                  {/* Profile Photo */}
                  <div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden shadow-sm border border-slate-200">
                    {builder.avatar_url ? (
                      <img src={builder.avatar_url} alt={builder.full_name} className="w-full h-full object-cover" />
                    ) : (
                      renderFallbackAvatar(builder.full_name)
                    )}
                  </div>

                  {/* Builder Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-base font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">{builder.full_name}</h4>
                      {builder.components_count > 20 && (
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-200">Elite</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-500 truncate">{builder.headline}</p>
                  </div>
                </Link>

                {/* Score & Action */}
                <div className="flex items-center gap-8">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Components</p>
                    <p className="text-xl font-black text-slate-900">{builder.components_count}</p>
                  </div>
                  <Link href={`/profile/${builder.id}`} className="bg-white border border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm whitespace-nowrap">
                    Profile
                  </Link>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}