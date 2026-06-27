"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LandingPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // --- NEW: DYNAMIC DATA STATES ---
  const [loadingData, setLoadingData] = useState(true);
  const [eliteTalent, setEliteTalent] = useState<any[]>([]);
  const [topComponents, setTopComponents] = useState<any[]>([]);
  const [topContributors, setTopContributors] = useState<any[]>([]);

  // --- NEW: FETCH PRODUCTION DATA ---
  useEffect(() => {
    async function fetchPlatformData() {
      try {
        // 1. Fetch Elite Talent (Top 4 verified builders)
        const { data: talentData } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'builder')
          .eq('is_verified', true) // Assuming elite talent must be verified
          .limit(4);
        
        if (talentData) setEliteTalent(talentData);

        // 2. Fetch Top Components (Top 5 by sales volume)
        const { data: componentData } = await supabase
          .from('components')
          .select('*')
          .order('sales_count', { ascending: false })
          .limit(5);

        if (componentData) setTopComponents(componentData);

        // 3. Fetch The Arena Leaders (Top 5 by rank)
        const { data: arenaData } = await supabase
          .from('profiles')
          .select('id, full_name, headline, avatar_url, arena_rank')
          .eq('role', 'builder')
          .order('arena_rank', { ascending: true })
          .limit(5);

        if (arenaData) setTopContributors(arenaData);

      } catch (error) {
        console.error("Error syncing platform data:", error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchPlatformData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setIsSearching(true);
    let targetTab = 'experts'; 
    const queryLower = searchInput.toLowerCase();

    try {
      const res = await fetch('/api/search-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchInput })
      });
      
      if (res.ok) {
        const data = await res.json();
        targetTab = data.intent === 'components' ? 'components' : 'experts';
      } else {
        throw new Error('AI API Timeout or Rate Limit');
      }

    } catch (error) {
      console.warn("AI Routing failed. Triggering Keyword Failsafe...");
      const componentKeywords = ['bot', 'app', 'script', 'prompt', 'code', 'pipeline', 'tool', 'api', 'software', 'model', 'architecture', 'database'];
      const isSeekingComponent = componentKeywords.some(keyword => queryLower.includes(keyword));
      targetTab = isSeekingComponent ? 'components' : 'experts';
    }

    router.push(`/buyer/discover?tab=${targetTab}&q=${encodeURIComponent(searchInput)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-hidden font-sans">
      
      <div className="absolute inset-0 z-0 h-[600px] w-full bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none"></div>
      
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-50 to-slate-50 pointer-events-none -z-10"></div>
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <section className="w-full max-w-6xl mx-auto px-6 pt-16 md:pt-20 pb-20 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-widest mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          Zelance Network v1.0 Live
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
          Find the top 1% of <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI Engineers.</span>
        </h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto mb-12">
          Search the global mesh for elite talent, acquire production-ready components, and deploy capital through secure escrow.
        </p>

        <div className="w-full max-w-3xl relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>
          
          <form onSubmit={handleSearch} className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-2 shadow-xl">
            <div className="pl-4 pr-2 text-slate-400">
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              )}
            </div>
            
            <input 
              type="text" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={isSearching}
              placeholder="Try searching 'AI Agent', 'Custom LLM', or 'AI Automation'..." 
              className="flex-1 bg-transparent border-none text-slate-900 font-medium text-lg px-2 py-4 outline-none placeholder:text-slate-400 disabled:opacity-50" 
            />
            
            <button 
              type="submit" 
              disabled={isSearching}
              className="bg-slate-900 hover:bg-blue-600 disabled:bg-slate-700 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-colors duration-300"
            >
              {isSearching ? 'Analyzing Intent...' : 'Search'}
            </button>
          </form>

        </div>
      </section>

      {loadingData ? (
        <div className="w-full py-20 flex flex-col items-center justify-center relative z-10">
           <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing Global Mesh...</p>
        </div>
      ) : (
        <>
          {/* ELITE TALENT SECTION */}
          <section className="w-full max-w-7xl mx-auto px-6 py-10 relative z-10">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Available Elite Talent</h2>
                <p className="text-slate-500 font-medium">Ranked by Arena performance and Escrow history.</p>
              </div>
              <Link href="/buyer/discover?tab=experts" className="hidden md:block text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">View All Builders →</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {eliteTalent.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                  No verified builders available yet.
                </div>
              ) : (
                eliteTalent.map((talent) => (
                  <div key={talent.id} className="bg-white border border-slate-200 rounded-3xl p-6 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group relative flex flex-col">
                    <div className="absolute top-6 right-6">
                      <span className="flex w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center mb-6 border border-blue-200/50 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                      {talent.avatar_url ? (
                        <img src={talent.avatar_url} alt={talent.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-blue-600">{talent.full_name?.charAt(0) || 'E'}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">{talent.full_name}</h3>
                    <p className="text-sm font-medium text-slate-500 mb-4 line-clamp-2">{talent.headline}</p>
                    
                    {/* Render first tech stack tag if available */}
                    {talent.tech_stack && talent.tech_stack.length > 0 && (
                      <span className="self-start inline-block bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg mb-6 truncate max-w-full">
                        {talent.tech_stack[0]}
                      </span>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                      <span className="text-sm font-black text-slate-900">${talent.hourly_rate_usd || 50}/hr</span>
                      <Link href={`/profile/${talent.id}`} className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">View Profile →</Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* COMPONENT EXCHANGE SECTION */}
          <section className="w-full max-w-7xl mx-auto px-6 py-10 mb-20 relative z-10">
            <div className="mb-16">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 px-2">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Component Exchange</h3>
                  <p className="text-slate-500 font-medium text-sm">Top purchased production-ready AI assets accelerating development today.</p>
                </div>
                <Link href="/buyer/discover?tab=components" className="text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors flex items-center gap-1">
                  View Exchange <span className="text-lg leading-none">→</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {topComponents.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                    No components deployed to the exchange yet.
                  </div>
                ) : (
                  topComponents.map(comp => (
                    <div key={comp.id} onClick={() => router.push(`/buyer/components/${comp.id}`)} className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 transition-all duration-300 group flex flex-col cursor-pointer">
                      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                          <img src={comp.thumbnail_url || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=400&h=250'} alt={comp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                          <h4 className="text-sm font-black text-slate-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{comp.title}</h4>
                          <div className="flex justify-between items-end mt-auto pt-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                              {comp.price_usd === 0 ? (
                                <p className="text-base font-black text-green-600">FREE</p>
                              ) : (
                                <p className="text-base font-black text-slate-900">${comp.price_usd}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Sales</p>
                              <p className="text-xs font-black text-blue-600">{comp.sales_count || 0}</p>
                            </div>
                          </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* THE ARENA SECTION */}
            <div className="bg-slate-900 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-2xl mb-16">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-slate-800 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3 border border-amber-500/20 shadow-sm">
                    👑 Live Rankings
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight mb-2">The Arena</h3>
                  <p className="text-slate-400 font-medium text-sm">Top contributors currently defining the global mesh architecture.</p>
                </div>
                <Link href="/builder/arena" className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                  View Leaderboard
                </Link>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {topContributors.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-500 text-sm font-bold border border-slate-800 rounded-3xl bg-slate-800/30">
                    Arena rankings are currently calculating.
                  </div>
                ) : (
                  topContributors.map((builder, index) => (
                    <div key={builder.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 transition-colors flex flex-col items-center text-center group">
                      <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 border-slate-600 group-hover:border-amber-500 transition-colors">
                        {builder.avatar_url ? (
                          <img src={builder.avatar_url} className="w-full h-full object-cover" alt={builder.full_name} />
                        ) : (
                          <div className="w-full h-full bg-slate-700 flex items-center justify-center text-xl font-black text-slate-300">
                            {builder.full_name?.charAt(0) || 'B'}
                          </div>
                        )}
                      </div>
                      <div className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1">Rank #{builder.arena_rank || index + 1}</div>
                      <Link href={`/profile/${builder.id}`} className="text-white font-black text-lg mb-1 hover:text-amber-500 transition-colors">
                        {builder.full_name}
                      </Link>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4 truncate w-full">{builder.headline || 'Zelance Builder'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 bg-white border border-slate-200 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 hover:shadow-xl transition-shadow duration-500">
              <div className="max-w-xl">
                <h3 className="text-2xl font-black text-slate-900 mb-3">Secure Collab & Escrow</h3>
                <p className="text-slate-500 font-medium text-sm mb-6">Lock scope explicitly. Funds are held safely in a Razorpay nodal account until the 72-hour delivery window clears. Flat $5 platform fees. Zero friction.</p>
                <Link href="/auth?role=buyer" className="text-sm font-bold text-slate-900 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center gap-2">Post an Open Bounty <span className="text-lg">→</span></Link>
              </div>
              <div className="w-full md:w-auto flex items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Buyer</span>
                  <div className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center text-xl">💼</div>
                </div>
                <div className="h-1 w-12 bg-blue-200 rounded-full relative">
                   <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full w-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Escrow Lock</span>
                  <div className="w-16 h-16 bg-blue-100 rounded-full shadow-inner border-2 border-blue-500 flex items-center justify-center text-xl">🔒</div>
                </div>
                <div className="h-1 w-12 bg-slate-200 rounded-full"></div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Builder</span>
                  <div className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center text-xl">💻</div>
                </div>
              </div>
            </div>

          </section>
        </>
      )}
    </div>
  );
}