"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

/* ── Inline SVG Icons ── */
const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
  </svg>
);
const PuzzleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a1.5 1.5 0 01-1.5 1.5H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V8.25c0-.621-.504-1.125-1.125-1.125h-2.625M12 15.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
  </svg>
);
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);
const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

export default function LandingPage() {
  // Hero Data
  const [topFreelancers, setTopFreelancers] = useState<any[]>([]);
  const [trendingServices, setTrendingServices] = useState<any[]>([]);
  
  // Ecosystem Feeds
  const [highValueBounties, setHighValueBounties] = useState<any[]>([]);
  const [trendingComponents, setTrendingComponents] = useState<any[]>([]);
  const [arenaChampions, setArenaChampions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchMarketplaceData() {
      // 1. Hero: Top Overall Freelancers
      const { data: freelancers } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, reputation_score')
        .order('reputation_score', { ascending: false })
        .limit(4);
      if (freelancers) setTopFreelancers(freelancers);

      // 2. Hero: Trending Startup Services (Tools)
      const { data: tools } = await supabase
        .from('listings')
        .select('*, profiles(company_name)')
        .order('created_at', { ascending: false })
        .limit(4);
      if (tools) setTrendingServices(tools);

      // 3. Ecosystem Feed: Top Paying Collab Bounties
      const { data: bounties } = await supabase
        .from('collab_posts')
        .select('*, profiles(company_name)')
        .eq('type', 'bounty')
        .order('budget', { ascending: false })
        .limit(3);
      if (bounties) setHighValueBounties(bounties);

      // 4. Ecosystem Feed: Top Selling Components
      const { data: components } = await supabase
        .from('network_components')
        .select('*, profiles(company_name)')
        .order('price', { ascending: false })
        .limit(3);
      if (components) setTrendingComponents(components);

      // 5. Ecosystem Feed: Arena Champions (Top Freelancers of the Week simulation)
      // Note: In a real app we'd filter by recent activity, here we take a slice of top profiles
      const { data: champions } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, reputation_score')
        .order('reputation_score', { ascending: false })
        .limit(3);
      if (champions) setArenaChampions(champions);
    }
    fetchMarketplaceData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-300 font-sans selection:bg-blue-500/30">
      
      {/* ── Navigation ── */}
      <nav className="absolute top-0 w-full z-50 border-b border-slate-800/50 bg-[#0b1120]/80 backdrop-blur-md">
        <div className="max-w-[90rem] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">Platform<span className="text-blue-500">.ai</span></span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Sign In / Register</Link>
          </div>
        </div>
      </nav>

      {/* ── Minimal Hero Section ── */}
      <div className="pt-32 pb-12 px-6 max-w-[90rem] mx-auto text-center relative z-10">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
          The Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">AI Exchange.</span>
        </h1>
        <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto">
          Hire elite AI freelancers, deploy startup infrastructure, and trade digital assets. All in one open ecosystem.
        </p>
      </div>

      {/* ── Side-by-Side Marketplace (The Core Vision) ── */}
      <div className="max-w-[90rem] mx-auto px-6 pb-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* LEFT SIDE: AI Talent & Freelancers */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <StarIcon className="w-6 h-6 text-amber-500" /> Top AI Talent
                </h2>
                <p className="text-sm text-slate-500 font-medium">Ranked by successful bounties and platform reputation.</p>
              </div>
              <Link href="/builder/network" className="text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                View All <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {topFreelancers.map((freelancer, idx) => (
                <div key={freelancer.id} className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl flex items-center justify-between hover:border-indigo-500/50 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {freelancer.full_name || freelancer.company_name || 'Anonymous Builder'}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        {freelancer.company_name || 'Independent Freelancer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reputation</p>
                    <div className="inline-flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                      <StarIcon className="w-3 h-3 text-amber-500" />
                      <span className="text-sm font-black text-white">{freelancer.reputation_score || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
              {topFreelancers.length === 0 && (
                <div className="p-10 border border-slate-800 rounded-2xl text-center text-slate-500 text-sm">Syncing Talent Network...</div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Startup Services & Infrastructure */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <PuzzleIcon className="w-6 h-6 text-blue-500" /> Startup Services
                </h2>
                <p className="text-sm text-slate-500 font-medium">Trending enterprise APIs, agents, and infrastructure.</p>
              </div>
              <Link href="/buyer/discover" className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                Browse Hub <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {trendingServices.map((service) => (
                <Link href={`/buyer/tool/${service.id}`} key={service.id} className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl flex items-center justify-between hover:border-blue-500/50 transition-colors group">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">{service.title}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">By {service.profiles?.company_name || 'Verified Startup'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Subscription</p>
                    <p className="text-lg font-black text-white">₹{service.price} <span className="text-xs font-medium text-slate-500">/mo</span></p>
                  </div>
                </Link>
              ))}
              {trendingServices.length === 0 && (
                 <div className="p-10 border border-slate-800 rounded-2xl text-center text-slate-500 text-sm">Indexing Services...</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Live Ecosystem Feeds (3-Column Layout) ── */}
      <div className="border-t border-slate-800 bg-[#0f172a] py-20 relative z-10">
        <div className="max-w-[90rem] mx-auto px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Feed 1: Collab Board */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
              <div>
                <div className="mb-6 border-b border-slate-800/50 pb-4">
                  <h3 className="text-xl font-black text-white flex items-center gap-2 mb-1">
                    <UsersIcon className="w-5 h-5 text-emerald-500" /> Collab Board
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Claim escrow-secured cash bounties.</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  {highValueBounties.map((bounty) => (
                    <div key={bounty.id} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                      <div>
                        <p className="text-sm font-bold text-slate-300 line-clamp-1">{bounty.title}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">By {bounty.profiles?.company_name || 'Enterprise'}</p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-sm font-black text-emerald-400">₹{bounty.budget}</span>
                      </div>
                    </div>
                  ))}
                  {highValueBounties.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No active bounties.</p>}
                </div>
              </div>
              
              <Link href="/builder/network" className="mt-6 w-full flex justify-center text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">
                View All Bounties &rarr;
              </Link>
            </div>

            {/* Feed 2: Component Exchange */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between group hover:border-purple-500/30 transition-colors">
              <div>
                <div className="mb-6 border-b border-slate-800/50 pb-4">
                  <h3 className="text-xl font-black text-white flex items-center gap-2 mb-1">
                    <PuzzleIcon className="w-5 h-5 text-purple-500" /> Component Exchange
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Trade premium UI code and micro-assets.</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  {trendingComponents.map((comp) => (
                    <div key={comp.id} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                      <div>
                        <p className="text-sm font-bold text-slate-300 line-clamp-1">{comp.title}</p>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-widest">{comp.language_tag || 'Code'}</span>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-sm font-black text-purple-400">₹{comp.price}</span>
                      </div>
                    </div>
                  ))}
                  {trendingComponents.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No components listed yet.</p>}
                </div>
              </div>
              
              <Link href="/builder/network" className="mt-6 w-full flex justify-center text-[10px] font-bold text-purple-500 uppercase tracking-widest hover:text-purple-400 transition-colors">
                Browse Marketplace &rarr;
              </Link>
            </div>

            {/* Feed 3: The Arena (Top Freelancers of the Week) */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between group hover:border-amber-500/30 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <TrophyIcon className="w-24 h-24 text-amber-500" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="mb-6 border-b border-slate-800/50 pb-4">
                    <h3 className="text-xl font-black text-white flex items-center gap-2 mb-1">
                      <TrophyIcon className="w-5 h-5 text-amber-500" /> The Arena
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Top ranking freelancers of the week.</p>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {arenaChampions.map((champ, idx) => (
                      <div key={champ.id} className="flex justify-between items-center p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-amber-500">#{idx + 1}</span>
                          <div>
                            <p className="text-sm font-bold text-white line-clamp-1">{champ.full_name || champ.company_name}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Rating</p>
                          <span className="text-sm font-black text-amber-400">{champ.reputation_score}</span>
                        </div>
                      </div>
                    ))}
                    {arenaChampions.length === 0 && <p className="text-xs text-slate-500 text-center py-4">Arena is calculating ranks.</p>}
                  </div>
                </div>
                
                <Link href="/builder/network" className="mt-6 w-full flex justify-center text-[10px] font-bold text-amber-500 uppercase tracking-widest hover:text-amber-400 transition-colors">
                  Join The Arena &rarr;
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}