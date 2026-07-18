"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ServiceCard } from '@/components/homepage/ServiceCard';
import { ServiceCardSkeleton } from '@/components/homepage/ServiceCardSkeleton';
import { SolutionCardGrid } from '@/components/service-cards/SolutionCardGrid';
import { SOLUTION_CARD_SECTION_CLASS } from '@/components/service-cards/solutionCardLayout';
import type { ServiceCardData } from '@/types/marketplace';
import { pickDisplayableImageUrl } from '@/lib/images';
import { useBuilderRecognitionMap } from '@/lib/arena/badges/useBuilderRecognitionMap';
import { ProjectCard } from '@/components/open-projects/ProjectCard';
import { ProjectCardSkeleton } from '@/components/open-projects/ProjectCard';
import { OpenProjectsEscrowSection } from '@/components/homepage/OpenProjectsEscrowSection';

export default function LandingPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [featuredServices, setFeaturedServices] = useState<ServiceCardData[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const builderIds = featuredServices.map((s) => s.builder_id);
  const { getPrimary } = useBuilderRecognitionMap(builderIds);

  useEffect(() => {
    async function fetchPlatformData() {
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
        .limit(8);

      const projectsPromise = fetch('/api/projects?featured=true&limit=3')
        .then((r) => (r.ok ? r.json() : { projects: [] }))
        .then((d) => ({ data: d.projects ?? [], error: null }))
        .catch((error) => ({ data: null, error }));

      const [servicesResult, projectsResult] = await Promise.allSettled([
        servicesPromise,
        projectsPromise,
      ]);

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
    router.push(`/buyer/discover?q=${encodeURIComponent(searchInput)}`);
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
          Search elite AI talent, browse open projects, discover production-ready AI Solutions, and deploy capital through secure escrow.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center mb-10">
          <Link href="/projects/new" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-md transition-colors">
            Post Project
          </Link>
          <Link href="/builder/dashboard?view=services" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-md transition-colors">
            Publish AI Solution
          </Link>
          <Link href="/projects" className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-sm transition-colors">
            Open Projects
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
              aria-label="Search AI Solutions or experts"
              placeholder="Try searching 'AI Agent', 'AI Engineer', or 'AI Automation'..."
              className="flex-1 bg-transparent border-none text-slate-900 font-medium text-lg px-2 py-4 outline-none placeholder:text-slate-400 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={isSearching}
              className="bg-slate-900 hover:bg-blue-600 disabled:bg-slate-700 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-colors duration-300"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      </main>

      <div className="w-full">
        <section className={`${SOLUTION_CARD_SECTION_CLASS} py-10 relative z-10`}>
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Featured AI Solutions</h2>
              <p className="text-slate-500 font-medium">Top listings by completed orders and recent activity.</p>
            </div>
            <Link href="/buyer/discover" className="hidden md:block text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">View All Solutions →</Link>
          </div>

          <SolutionCardGrid>
            {loadingServices ? (
              [...Array(6)].map((_, i) => <ServiceCardSkeleton key={i} index={i} />)
            ) : servicesError ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                {servicesError}
              </div>
            ) : featuredServices.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold border border-slate-200 rounded-3xl bg-white/50">
                No AI Solutions available yet.
              </div>
            ) : (
              featuredServices.map((service) => (
                <ServiceCard
                  key={service.service_id}
                  service={service}
                  recognitionBadge={getPrimary(service.builder_id)}
                />
              ))
            )}
          </SolutionCardGrid>
        </section>

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
              featuredProjects.map((p) => <ProjectCard key={p.id} project={p} />)
            )}
          </div>
        </section>

        <section className="w-full max-w-7xl mx-auto px-6 py-10 mb-20 relative z-10">
          <OpenProjectsEscrowSection />
        </section>
      </div>
    </div>
  );
}
