"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

/* ── High-End SVG Icons (Dark Mode Optimized) ── */
const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
  </svg>
);
const PuzzleIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a1.5 1.5 0 01-1.5 1.5H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V8.25c0-.621-.504-1.125-1.125-1.125h-2.625M12 15.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
  </svg>
);
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);
const ShieldCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const CodeIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

export default function BuilderNetworkHub() {
  const [activeTab, setActiveTab] = useState<'collab' | 'components' | 'arena'>('collab');
  
  // Dynamic State for our Database connections
  const [collabPosts, setCollabPosts] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeArenaEvent, setActiveArenaEvent] = useState<any>(null); // Null means no event is live
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNetworkData() {
      // 1. Fetch Collab Posts
      const { data: posts } = await supabase
        .from('collab_posts')
        .select('*, profiles(company_name, full_name)')
        .order('created_at', { ascending: false });
      if (posts) setCollabPosts(posts);

      // 2. Fetch Components
      const { data: comps } = await supabase
        .from('network_components')
        .select('*, profiles(company_name)')
        .order('created_at', { ascending: false });
      if (comps) setComponents(comps);

      // 3. Fetch Global Leaderboard (Freelancers/Builders ranked by Reputation)
      const { data: leaders } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, reputation_score')
        .order('reputation_score', { ascending: false })
        .limit(10);
      if (leaders) setLeaderboard(leaders);

      setLoading(false);
    }
    fetchNetworkData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-300 font-sans pb-24 selection:bg-blue-500/30">
      
      {/* ── Network Header ── */}
      <div className="bg-[#0f172a] border-b border-slate-800/60 sticky top-0 z-40 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">Live Network</p>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Builder Network</h1>
          <p className="text-sm text-slate-400 font-medium max-w-2xl">The exclusive underground for AI founders. Trade micro-assets, secure co-founders, and battle for the top rank.</p>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex gap-1 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('collab')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'collab' ? 'border-blue-500 text-white bg-blue-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
            <UsersIcon /> Collab Board
          </button>
          <button 
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'components' ? 'border-purple-500 text-white bg-purple-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
            <PuzzleIcon /> Component Exchange
          </button>
          <button 
            onClick={() => setActiveTab('arena')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'arena' ? 'border-amber-500 text-white bg-amber-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
            <TrophyIcon /> The Arena
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-10">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
             <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-600 rounded-full animate-spin mb-4"></div>
             <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Syncing Network...</p>
          </div>
        ) : (
          <>
            {/* =========================================
                TAB 1: COLLAB BOARD
                ========================================= */}
            {activeTab === 'collab' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
                  <div>
                    <h2 className="text-lg font-black text-white mb-1">Co-Founder & Bounty Matrix</h2>
                    <p className="text-xs text-slate-400 font-medium">Post open gigs or seek partners. Escrow protection automatically applied to all cash bounties.</p>
                  </div>
                  <Link href="/builder/network/publish?action=collab" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  Post Request
                  </Link>
                </div>

                {collabPosts.length === 0 ? (
                  <div className="text-center py-20 bg-[#0f172a] border border-slate-800 rounded-2xl">
                    <UsersIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">No Active Requests</h3>
                    <p className="text-sm text-slate-500">The board is currently clear. Be the first to post a bounty or equity split!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {collabPosts.map((post) => (
                      <div key={post.id} className="bg-[#0f172a] border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all group flex flex-col md:flex-row justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            {post.type === 'bounty' ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <ShieldCheckIcon /> Escrow Protected
                              </span>
                            ) : (
                              <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
                                Equity Split
                              </span>
                            )}
                            <span className="text-slate-500 text-xs font-bold">By {post.profiles?.company_name || post.profiles?.full_name || 'Anonymous'}</span>
                          </div>
                          <h3 className="text-xl font-black text-white mb-2 group-hover:text-blue-400 transition-colors">{post.title}</h3>
                          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed mb-4">
                            {post.description}
                          </p>
                          <div className="flex gap-2">
                            {post.tags?.map((tag: string, i: number) => (
                              <span key={i} className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-[10px] font-bold">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-start md:items-end justify-between shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                          <div className="text-left md:text-right mb-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Offering</p>
                            <p className={`text-2xl font-black ${post.type === 'bounty' ? 'text-emerald-400' : 'text-purple-400'}`}>
                              {post.type === 'bounty' ? `₹${post.budget}` : post.budget}
                            </p>
                          </div>
                          <Link href="/builder/network/publish?action=message" className="w-full md:w-auto bg-slate-800 text-white border border-slate-700 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-700 transition-colors">
                            Message
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =========================================
                TAB 2: COMPONENT EXCHANGE
                ========================================= */}
            {activeTab === 'components' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
                  <div>
                    <h2 className="text-lg font-black text-white mb-1">Asset & Component Exchange</h2>
                    <p className="text-xs text-slate-400 font-medium">Accelerate your build. Buy and sell micro-assets, prompts, and UI components.</p>
                  </div>
                  <div className="flex gap-3">
                <Link href="/builder/network/publish?action=component" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)]">Sell Component</Link>
                  </div>
                </div>

                {components.length === 0 ? (
                   <div className="text-center py-20 bg-[#0f172a] border border-slate-800 rounded-2xl">
                     <PuzzleIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                     <h3 className="text-lg font-bold text-white mb-2">Marketplace Empty</h3>
                     <p className="text-sm text-slate-500">No components have been listed yet. Be the first to sell your code!</p>
                   </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {components.map((comp) => (
                      <div key={comp.id} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/50 transition-colors group">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                              <CodeIcon />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{comp.language_tag || 'Code'}</span>
                          </div>
                          <h3 className="text-base font-black text-white mb-2 group-hover:text-purple-400 transition-colors">{comp.title}</h3>
                          <p className="text-xs text-slate-400 mb-6 line-clamp-2">{comp.description}</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                          <p className="text-xl font-black text-white">₹{comp.price}</p>
                          <Link href="/builder/network/publish?action=arena" className="mt-6 inline-block bg-amber-500 text-slate-900 hover:bg-amber-400 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(245,158,11,0.4)] relative z-10">Host a Throwdown</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =========================================
                TAB 3: THE ARENA & GLOBAL LEADERBOARD
                ========================================= */}
            {activeTab === 'arena' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-12">
                
                {/* Section A: The Arena (Active or Empty State) */}
                <div>
                  {activeArenaEvent ? (
                    // Logic for Active Event would go here
                    <div className="bg-gradient-to-br from-amber-500/20 via-[#111827] to-[#111827] border border-amber-500/30 p-8 rounded-3xl relative overflow-hidden">
                      {/* ... Active Event UI ... */}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-[#0f172a] border border-slate-800 rounded-3xl relative overflow-hidden">
                       <TrophyIcon className="w-20 h-20 text-slate-800 mx-auto mb-6 relative z-10" />
                       <h3 className="text-2xl font-black text-white mb-2 relative z-10">No Active Throwdowns</h3>
                       <p className="text-sm text-slate-500 max-w-md mx-auto relative z-10">The Arena is currently closed. Sharpen your tools and check back soon for the next global tournament.</p>
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                    </div>
                  )}
                </div>

                {/* Section B: Global Freelancer Leaderboard (Always Visible) */}
                <div>
                  <div className="flex items-center justify-between mb-6 pl-2">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                        <StarIcon className="w-5 h-5 text-amber-500" /> Global Builder Leaderboard
                      </h3>
                      <p className="text-xs text-slate-400">Rankings based on successful bounties, assets sold, and community upvotes.</p>
                    </div>
                  </div>

                  <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/50">
                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center">Rank</th>
                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Builder / Agency</th>
                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Reputation Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {leaderboard.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-8 px-6 text-center text-slate-500 text-sm">
                                Leaderboard is calculating. New ranks drop soon.
                              </td>
                            </tr>
                          ) : (
                            leaderboard.map((leader, idx) => (
                              <tr key={leader.id} className="hover:bg-slate-800/20 transition-colors group">
                                <td className="py-4 px-6 text-center">
                                  <span className={`text-lg font-black ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {leader.full_name || leader.company_name || 'Anonymous Builder'}
                                  </p>
                                  {leader.company_name && leader.full_name && (
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{leader.company_name}</p>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="inline-flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-md border border-slate-700">
                                    <StarIcon className="w-3 h-3 text-amber-500" />
                                    <span className="text-sm font-black text-white">{leader.reputation_score || 0}</span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}