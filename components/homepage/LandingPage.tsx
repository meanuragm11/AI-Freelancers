"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ServiceCard } from '@/components/homepage/ServiceCard';
import { ServiceCardSkeleton } from '@/components/homepage/ServiceCardSkeleton';
import { AssetCard } from '@/components/homepage/AssetCard';
import { AssetCardSkeleton } from '@/components/homepage/AssetCardSkeleton';
import type { ServiceCardData } from '@/types/marketplace';
import { pickDisplayableImageUrl } from '@/lib/images';
import { fetchArenaBuilders } from '@/lib/arena/rankBuilders';
import { ProjectCard } from '@/components/open-projects/ProjectCard';
import { ProjectCardSkeleton } from '@/components/open-projects/ProjectCard';
import { OpenProjectsEscrowSection } from '@/components/homepage/OpenProjectsEscrowSection';

export default function LandingPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingContributors, setLoadingContributors] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [contributorsError, setContributorsError] = useState<string | null>(null);

  const [featuredServices, setFeaturedServices] = useState<ServiceCardData[]>([]);
  const [topAssets, setTopAssets] = useState<any[]>([]);
  const [topContributors, setTopContributors] = useState<any[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlatformData() {
      // Fetch services
      const servicesPromise = supabase
        .from('services')
        .select(`
          id, builder_id, title, short_description, category, ai_skills, cover_image_url,
          delivery_time_days, starting_price_usd, rating_avg, review_count, order_count, created_at,
          builder:profiles_public!builder_id(
            id, full_name, headline, avatar_url, banner_url, tech_stack,
            average_rating, review_count, average_response_hours,
            completed_projects, is_top_expert, is_verified
          )
        `)
        .eq('status', 'published')
        .order('order_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4);

      // Fetch assets (components)
      const assetsPromise = supabase
        .from('components')
        .select('*, builder:profiles_public!builder_id(full_name)')
        .eq('status', 'published')
        .order('sales_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      const contributorsPromise = fetchArenaBuilders(supabase, 5).then((ranked) => ({
        data: ranked.map((builder) => ({ ...builder, arena_rank: builder.rank })),
        error: null,
      })).catch((error) => ({
        data: null,
        error,
      }));

      const projectsPromise = fetch('/api/projects?limit=3&sort=newest')
        .then((r) => (r.ok ? r.json() : { projects: [] }))
        .then((d) => ({ data: d.projects ?? [], error: null }))
        .catch((error) => ({ data: null, error }));

      // Use Promise.allSettled to handle failures independently
      const [servicesResult, assetsResult, contributorsResult, projectsResult] = await Promise.allSettled([
        servicesPromise,
        assetsPromise,
        contributorsPromise,
        projectsPromise,
      ]);

      // Handle services result
      if (servicesResult.status === 'fulfilled') {
        const { data: servicesData, error: servicesErr } = servicesResult.value;
        if (servicesErr) {
          console.error('Error fetching services:', servicesErr);
          setServicesError('Unable to load services.');
        } else if (servicesData) {
          const enrichedServices: ServiceCardData[] = servicesData.map((s: any) => {
            const b = s.builder || {};
            const completedCount = b.completed_projects ?? 0;
            const responseHours = b.average_response_hours;
            const responseLabel = responseHours != null && responseHours <= 1
              ? '< 1 hr'
              : responseHours != null && responseHours <= 2
                ? '< 2 hrs'
                : '< 4 hrs';

            return {
              service_id: s.id,
              builder_id: s.builder_id,
              full_name: b.full_name,
              headline: b.headline,
              avatar_url: pickDisplayableImageUrl(b.avatar_url),
              banner_url: pickDisplayableImageUrl(b.banner_url),
              tech_stack: s.ai_skills?.length ? s.ai_skills : (b.tech_stack || []),
              completed_projects: completedCount,
              is_verified: b.is_verified || false,
              is_top_expert: b.is_top_expert || false,
              calculated_rating: Number(s.rating_avg) || Number(b.average_rating) || 0,
              service_title: s.title,
              service_description: s.short_description || '',
              service_image: pickDisplayableImageUrl(s.cover_image_url, b.banner_url) || '',
              delivery_time_days: s.delivery_time_days || 7,
              review_count: s.review_count || b.review_count || 0,
              response_time_label: responseLabel,
              is_fast_response: responseHours != null && responseHours <= 2,
              starting_price_usd: Number(s.starting_price_usd) || 0,
              category: s.category,
              created_at: s.created_at,
            };
          });
          setFeaturedServices(enrichedServices);
        }
      } else {
        console.error('Services fetch failed:', servicesResult.reason);
        setServicesError('Unable to load services.');
      }
      setLoadingServices(false);

      // Handle assets result
      if (assetsResult.status === 'fulfilled') {
        const { data: assetsData, error: assetsErr } = assetsResult.value;
        if (assetsErr) {
          console.error('Error fetching assets:', assetsErr);
          setAssetsError('Unable to load assets.');
        } else if (assetsData) {
          setTopAssets(assetsData);
        }
      } else {
        console.error('Assets fetch failed:', assetsResult.reason);
        setAssetsError('Unable to load assets.');
      }
      setLoadingAssets(false);

      // Handle contributors result
      if (contributorsResult.status === 'fulfilled') {
        const { data: contributorsData, error: contributorsErr } = contributorsResult.value;
        if (contributorsErr) {
          console.error('Error fetching contributors:', contributorsErr);
          setContributorsError('Unable to load contributors.');
        } else if (contributorsData) {
          setTopContributors(contributorsData);
        }
      } else {
        console.error('Contributors fetch failed:', contributorsResult.reason);
        setContributorsError('Unable to load contributors.');
      }
      setLoadingContributors(false);

      if (projectsResult.status === 'fulfilled') {
        const { data: projectsData, error: projectsErr } = projectsResult.value;
        if (projectsErr) setProjectsError('Unable to load open projects.');
        else setFeaturedProjects(projectsData ?? []);
      } else {
        setProjectsError('Unable to load open projects.');
      }
      setLoadingProjects(false);
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
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <main className="w-full max-w-6xl mx-auto px-6 pt-16 md:pt-20 pb-20 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-widest mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          Zelance Network v1.0 Live
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
          Find the top 1% of <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI Engineers.</span>
        </h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto mb-8">
          Search elite AI talent, browse open projects, acquire production-ready assets, and deploy capital through secure escrow.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link href="/projects/new" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-md transition-colors">
            Post a Project
          </Link>
          <Link href="/projects" className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-sm transition-colors">
            Browse Projects
          </Link>
        </div>

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
              aria-label="Search Talent or Components"
              placeholder="Try searching 'AI Agent', 'AI Engineer', or 'AI Automation'..." 
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
      </main>

      <div className="w-full">
        {/* FEATURED AI SERVICES SECTION */}
        <section className="w-full max-w-7xl mx-auto px-6 py-10 relative z-10">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Featured AI Services</h2>
              <p className="text-slate-500 font-medium">Top services by completed orders and recent listings.</p>
            </div>
            <Link href="/buyer/discover?tab=experts" className="hidden md:block text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">View All Services →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {loadingServices ? (
              [...Array(4)].map((_, i) => <ServiceCardSkeleton key={i} index={i} />)
            ) : servicesError ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                {servicesError}
              </div>
            ) : featuredServices.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                No services available yet.
              </div>
            ) : (
              featuredServices.map((service) => (
                <ServiceCard key={service.service_id} service={service} />
              ))
            )}
          </div>
        </section>

        {/* FEATURED OPEN PROJECTS */}
        <section className="w-full max-w-7xl mx-auto px-6 py-10 relative z-10">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Featured Open Projects</h2>
              <p className="text-slate-500 font-medium">Post your project or submit proposals — hire through escrow when ready.</p>
            </div>
            <Link href="/projects" className="hidden md:block text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">View All Projects →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loadingProjects ? (
              [...Array(3)].map((_, i) => <ProjectCardSkeleton key={i} />)
            ) : projectsError ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">{projectsError}</div>
            ) : featuredProjects.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                No open projects yet. <Link href="/projects/new" className="text-blue-600 hover:underline">Post the first one →</Link>
              </div>
            ) : (
              featuredProjects.map((p) => <ProjectCard key={p.id} project={p} showBuyer />)
            )}
          </div>
        </section>

          {/* AI ASSETS SECTION */}
          <section className="w-full max-w-7xl mx-auto px-6 py-10 mb-20 relative z-10">
            <div className="mb-16">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 px-2">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">AI Assets</h3>
                  <p className="text-slate-500 font-medium text-sm">Reusable AI assets: Prompt Packs, AI Agents, Workflows, Templates, APIs, MCP Servers, and more.</p>
                </div>
                <Link href="/buyer/discover?tab=components" className="text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors flex items-center gap-1">
                  View All Assets <span className="text-lg leading-none">→</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {loadingAssets ? (
                  [...Array(5)].map((_, i) => <AssetCardSkeleton key={i} index={i} />)
                ) : assetsError ? (
                  <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                    {assetsError}
                  </div>
                ) : topAssets.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                    No assets available yet.
                  </div>
                ) : (
                  topAssets.map((asset, index) => (
                    <AssetCard key={asset.id} asset={asset} index={index} />
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
                <Link href="/arena" className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                  View Leaderboard
                </Link>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {loadingContributors ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center text-center animate-pulse" aria-hidden="true">
                      <div className="w-16 h-16 rounded-full bg-slate-700 mb-4 border-2 border-slate-600" />
                      <div className="h-2.5 w-12 rounded-full bg-slate-600 mb-1" />
                      <div className="h-5 w-24 rounded-md bg-slate-600 mb-1" />
                      <div className="h-2.5 w-28 rounded-md bg-slate-700" />
                    </div>
                  ))
                ) : contributorsError ? (
                  <div className="col-span-full py-8 text-center text-slate-500 text-sm font-bold border border-slate-800 rounded-3xl bg-slate-800/30">
                    {contributorsError}
                  </div>
                ) : topContributors.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-500 text-sm font-bold border border-slate-800 rounded-3xl bg-slate-800/30">
                    Arena rankings are currently calculating.
                  </div>
                ) : (
                  topContributors.map((builder, index) => (
                    <div key={builder.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 transition-colors flex flex-col items-center text-center group">
                      <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 border-slate-600 group-hover:border-amber-500 transition-colors relative">
                        {builder.avatar_url ? (
                          <Image src={builder.avatar_url} fill sizes="64px" className="object-cover" alt={builder.full_name} />
                        ) : (
                          <div className="w-full h-full bg-slate-700 flex items-center justify-center text-xl font-black text-slate-300 relative z-10">
                            {builder.full_name?.charAt(0) || 'B'}
                          </div>
                        )}
                      </div>
                      <div className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1">Rank #{builder.arena_rank || index + 1}</div>
                      <Link href={`/profile/${builder.id}`} className="text-white font-black text-lg mb-1 hover:text-amber-500 transition-colors">
                        {builder.full_name}
                      </Link>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 truncate w-full">{builder.headline || 'Zelance Builder'}</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{builder.components_count} Published</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <OpenProjectsEscrowSection />

          </section>
        </div>
      </div>
  );
}