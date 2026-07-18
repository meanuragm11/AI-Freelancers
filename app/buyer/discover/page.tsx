"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ServiceCard } from '@/components/homepage/ServiceCard';
import { ServiceCardSkeleton } from '@/components/homepage/ServiceCardSkeleton';
import { SolutionCardGrid } from '@/components/service-cards/SolutionCardGrid';
import { SOLUTION_CARD_SECTION_CLASS } from '@/components/service-cards/solutionCardLayout';
import type { ServiceCardData } from '@/types/marketplace';
import { pickDisplayableImageUrl } from '@/lib/images';
import { useBuilderRecognitionMap } from '@/lib/arena/badges/useBuilderRecognitionMap';
import { RECOGNITION_BADGES, type RecognitionBadgeKey } from '@/lib/arena/badges/types';

const BADGE_FILTERS: Array<{ key: '' | RecognitionBadgeKey; label: string }> = [
  { key: '', label: 'All' },
  { key: 'trusted', label: 'Trusted' },
  { key: 'rising', label: 'Rising' },
  { key: 'in_demand', label: 'In Demand' },
  { key: 'fast_responder', label: 'Fast Responders' },
  { key: 'editors_pick', label: "Editor's Picks" },
];

const POPULAR_SKILLS = [
  "Generative AI", "Prompt Engineering", "AI Agents", "Agentic AI", "AI Automation",
  "Cursor AI", "Claude Code", "GitHub Copilot", "Vibe Coding", "LangChain",
  "LangGraph", "CrewAI", "AutoGen", "LlamaIndex", "RAG", "OpenAI API",
  "Gemini API", "Claude API", "DeepSeek API", "Groq API", "Python",
  "FastAPI", "Node.js", "React", "Next.js", "TypeScript", "Docker",
  "Kubernetes", "AWS", "Azure", "Google Cloud", "Pinecone", "Weaviate",
  "Qdrant", "ChromaDB", "FAISS", "ComfyUI", "Flux", "Stable Diffusion",
  "Midjourney", "ElevenLabs", "AI Video", "AI Images", "AI Voice",
  "YouTube Automation", "SEO", "Copywriting", "AI Marketing", "Content Creation",
  "Zapier", "Make.com", "n8n", "MCP", "A2A", "Fine Tuning", "LoRA", "QLoRA",
  "HuggingFace", "TensorFlow", "PyTorch", "Scikit Learn", "Data Engineering",
  "Machine Learning", "Deep Learning", "Computer Vision", "NLP", "Speech AI", "AI Consulting"
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "India", "Germany",
  "France", "Japan", "Singapore", "Netherlands", "Brazil", "Switzerland",
  "United Arab Emirates", "Sweden", "Israel", "South Korea", "Spain", "Italy", "Other"
];

const isVerifiedExpert = (completedCount: number) => completedCount >= 1;
const isTopExpert = (completedCount: number) => completedCount >= 10;

function DiscoverContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [allServices, setAllServices] = useState<ServiceCardData[]>([]);
  const [visibleExperts, setVisibleExperts] = useState(24);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  const [selectedSkills, setSelectedSkills] = useState<string[]>(searchParams.get('skills')?.split(',').filter(Boolean) || []);
  const [skillSearch, setSkillSearch] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>(searchParams.get('min') ? Number(searchParams.get('min')) : '');
  const [maxPrice, setMaxPrice] = useState<number | ''>(searchParams.get('max') ? Number(searchParams.get('max')) : '');
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevant');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [maxDeliveryDays, setMaxDeliveryDays] = useState<number | ''>(searchParams.get('delivery') ? Number(searchParams.get('delivery')) : '');
  const [badgeFilter, setBadgeFilter] = useState<'' | RecognitionBadgeKey>(
    (searchParams.get('badge') as RecognitionBadgeKey) || ''
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (selectedSkills.length > 0) params.set('skills', selectedSkills.join(','));
    if (minPrice !== '') params.set('min', minPrice.toString());
    if (maxPrice !== '') params.set('max', maxPrice.toString());
    if (selectedCountry) params.set('country', selectedCountry);
    if (verifiedOnly) params.set('verified', 'true');
    if (maxDeliveryDays !== '') params.set('delivery', maxDeliveryDays.toString());
    if (badgeFilter) params.set('badge', badgeFilter);
    if (sortBy !== 'relevant') params.set('sort', sortBy);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedQuery, selectedSkills, minPrice, maxPrice, selectedCountry, verifiedOnly, sortBy, maxDeliveryDays, badgeFilter, pathname, router]);

  useEffect(() => { updateURL(); }, [updateURL]);

  useEffect(() => {
    async function fetchMarketplace() {
      setLoading(true);
      try {
        const { data: services, error: servicesErr } = await supabase
          .from('services')
          .select(`
            id, builder_id, title, short_description, category, ai_skills, cover_image_url,
            delivery_time_days, starting_price_usd, rating_avg, review_count, created_at, view_count,
            builder:profiles_public!builder_id(
              id, full_name, headline, avatar_url, banner_url, tech_stack, location,
              reputation_score, average_rating, review_count, average_response_hours,
              completed_projects, is_top_expert, is_verified, profile_views
            )
          `)
          .eq('status', 'published');

        if (servicesErr) throw servicesErr;

        const enrichedServices: ServiceCardData[] = (services || []).map((s: any) => {
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
            location: b.location,
            avatar_url: pickDisplayableImageUrl(b.avatar_url),
            banner_url: pickDisplayableImageUrl(b.banner_url),
            tech_stack: s.ai_skills?.length ? s.ai_skills : (b.tech_stack || []),
            completed_projects: completedCount,
            is_verified: b.is_verified || isVerifiedExpert(completedCount),
            is_top_expert: b.is_top_expert || isTopExpert(completedCount),
            calculated_rating: Number(s.rating_avg) || Number(b.average_rating) || 0,
            service_title: s.title,
            service_description: s.short_description || b.headline || '',
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

        setAllServices(enrichedServices);
      } catch (err) {
        console.error("Failed to load marketplace:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMarketplace();

    const channel = supabase
      .channel('discover_services_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchMarketplace())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getServiceScore = useCallback((service: ServiceCardData, query: string) => {
    if (!query) return 1;
    const keywords = query.toLowerCase().split(' ').filter(Boolean);
    let totalScore = 0;
    let matchedKeywords = 0;

    for (const kw of keywords) {
      let kwScore = 0;
      const name = service.full_name?.toLowerCase() || '';
      const headline = service.headline?.toLowerCase() || '';
      const serviceTitle = service.service_title?.toLowerCase() || '';
      const serviceDescription = service.service_description?.toLowerCase() || '';

      if (name === kw) kwScore += 100;
      else if (name.includes(kw)) kwScore += 50;
      if (headline === kw) kwScore += 45;
      else if (headline.includes(kw)) kwScore += 40;
      if (serviceTitle === kw) kwScore += 60;
      else if (serviceTitle.includes(kw)) kwScore += 50;
      if (serviceDescription.includes(kw)) kwScore += 20;
      if (service.tech_stack?.some((s: string) => s.toLowerCase() === kw)) kwScore += 35;
      else if (service.tech_stack?.some((s: string) => s.toLowerCase().includes(kw))) kwScore += 30;
      if (service.category?.toLowerCase().includes(kw)) kwScore += 25;

      if (kwScore > 0) { matchedKeywords++; totalScore += kwScore; }
    }
    return matchedKeywords === keywords.length ? totalScore : 0;
  }, []);

  const platformSkills = useMemo(() => {
    const skills = new Set<string>();
    allServices.forEach((s) => { s.tech_stack?.forEach((skill: string) => skills.add(skill)); });
    return Array.from(skills);
  }, [allServices]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return platformSkills.slice(0, 5);
    const q = searchQuery.toLowerCase();
    return platformSkills.filter(s => s.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery, platformSkills]);

  const builderIds = useMemo(
    () => allServices.map((s) => s.builder_id).filter(Boolean),
    [allServices]
  );
  const { badgeMap, getPrimary } = useBuilderRecognitionMap(builderIds);

  const filteredServices = useMemo(() => {
    let result = [...allServices];

    if (debouncedQuery.trim()) {
      result = result
        .map((service) => ({ service, score: getServiceScore(service, debouncedQuery) }))
        .filter((item) => item.score > 0)
        .map((item) => item.service);
    }

    result = result.filter((service) => {
      if (selectedSkills.length > 0 && !selectedSkills.every((skill) => service.tech_stack?.includes(skill))) return false;
      if (verifiedOnly && !service.is_verified) return false;
      if (selectedCountry && service.location !== selectedCountry) return false;
      if (minPrice !== '' && (service.starting_price_usd || 0) < Number(minPrice)) return false;
      if (maxPrice !== '' && (service.starting_price_usd || 0) > Number(maxPrice)) return false;
      if (maxDeliveryDays !== '' && service.delivery_time_days > Number(maxDeliveryDays)) return false;
      if (badgeFilter) {
        const badges = badgeMap[service.builder_id] ?? [];
        if (!badges.some((b) => b.key === badgeFilter)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (debouncedQuery && sortBy === 'relevant') return getServiceScore(b, debouncedQuery) - getServiceScore(a, debouncedQuery);
      if (sortBy === 'top') return (b.is_top_expert ? 1 : 0) - (a.is_top_expert ? 1 : 0);
      if (sortBy === 'verified') return (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
      if (sortBy === 'reputation' || sortBy === 'rating') return (b.calculated_rating || 0) - (a.calculated_rating || 0);
      if (sortBy === 'projects') return b.completed_projects - a.completed_projects;
      if (sortBy === 'price_low') return (a.starting_price_usd || 0) - (b.starting_price_usd || 0);
      if (sortBy === 'price_high') return (b.starting_price_usd || 0) - (a.starting_price_usd || 0);
      if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();

      if (a.is_verified !== b.is_verified) return (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
      if (a.is_top_expert !== b.is_top_expert) return (b.is_top_expert ? 1 : 0) - (a.is_top_expert ? 1 : 0);
      if ((b.calculated_rating || 0) !== (a.calculated_rating || 0)) return (b.calculated_rating || 0) - (a.calculated_rating || 0);
      if (b.completed_projects !== a.completed_projects) return b.completed_projects - a.completed_projects;
      return (b.starting_price_usd || 0) - (a.starting_price_usd || 0);
    });

    return result;
  }, [allServices, debouncedQuery, selectedSkills, verifiedOnly, selectedCountry, minPrice, maxPrice, maxDeliveryDays, sortBy, badgeFilter, badgeMap, getServiceScore]);

  const fallbackServices = useMemo(
    () => [...allServices].sort((a, b) => b.completed_projects - a.completed_projects).slice(0, 8),
    [allServices]
  );

  const clearFilters = () => {
    setSelectedSkills([]);
    setMinPrice('');
    setMaxPrice('');
    setSelectedCountry('');
    setVerifiedOnly(false);
    setSearchQuery('');
    setSortBy('relevant');
    setMaxDeliveryDays('');
    setBadgeFilter('');
  };

  const toggleSkill = (skill: string) => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden">
      <div className="bg-slate-900 text-white relative border-b border-slate-800">
        <div className={`${SOLUTION_CARD_SECTION_CLASS} py-12 md:py-16 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8`}>
          <div className="flex-1 w-full text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
              Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-400">AI Solutions</span> from vetted experts.
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-medium max-w-xl mx-auto md:mx-0">
              Browse fixed-price AI Solutions or launch a custom project when your idea needs a tailored build.
            </p>
          </div>
          <div className="flex-1 w-full max-w-xl relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search AI Solutions or experts..."
              aria-label="Search AI Solutions"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-2xl pl-5 pr-28 py-4 outline-none focus:border-blue-500 transition-colors shadow-inner font-medium text-sm"
            />
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2">Platform Skills</p>
                  {searchSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setSearchQuery(s); setShowSuggestions(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors flex justify-between items-center group"
                    >
                      <span>{s}</span>
                      <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-16 sm:top-20 z-40 shadow-sm">
        <div className={`${SOLUTION_CARD_SECTION_CLASS} flex items-center justify-between min-h-[44px]`}>
          <div className="flex gap-4 sm:gap-8 overflow-x-auto">
            <span className="py-4 text-xs md:text-sm font-black uppercase tracking-widest text-blue-600 relative">
              AI Solutions
              <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></span>
            </span>
          </div>
          <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="md:hidden flex items-center gap-2 min-h-[44px] px-2 text-xs font-black uppercase tracking-widest text-slate-600 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg> Filters
          </button>
        </div>
      </div>

      <div className={`${SOLUTION_CARD_SECTION_CLASS} py-8`}>
        <div className="flex flex-col md:flex-row gap-8 mb-6 min-w-0">
          <aside className={`w-full md:w-64 shrink-0 min-w-0 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm md:sticky md:top-24">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Filters</h3>
                <button onClick={clearFilters} className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500">Clear</button>
              </div>

              <div className="mb-6">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Recognition</h4>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_FILTERS.map((filter) => (
                    <button
                      key={filter.key || 'all'}
                      type="button"
                      onClick={() => setBadgeFilter(filter.key)}
                      className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                        badgeFilter === filter.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {filter.key ? `${RECOGNITION_BADGES[filter.key].emoji} ${filter.label}` : filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between cursor-pointer group p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Verified Only</span>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${verifiedOnly ? 'bg-green-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${verifiedOnly ? 'translate-x-4' : ''}`}></div>
                </div>
                <input type="checkbox" className="hidden" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
              </label>

              <div className="mb-6">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Country</h4>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                  aria-label="Filter by country"
                >
                  <option value="">Any country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Skills</h4>
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold outline-none mb-3 focus:border-blue-500 transition-all shadow-inner"
                  aria-label="Filter specific skills"
                />
                <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                  {POPULAR_SKILLS.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase())).map(skill => (
                    <label key={skill} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" className="hidden" checked={selectedSkills.includes(skill)} onChange={() => toggleSkill(skill)} />
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors border ${selectedSkills.includes(skill) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                        {selectedSkills.includes(skill) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Max Delivery (days)</h4>
                <input type="number" placeholder="e.g. 14" value={maxDeliveryDays} onChange={(e) => setMaxDeliveryDays(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none text-center focus:border-blue-500" />
              </div>

              <div className="mb-6">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Budget (USD)</h4>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none text-center focus:border-blue-500" />
                  <span className="text-slate-300">-</span>
                  <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none text-center focus:border-blue-500" />
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                {(debouncedQuery || verifiedOnly || selectedCountry || selectedSkills.length > 0 || badgeFilter) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {debouncedQuery && <span className="bg-slate-900 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">&quot;{debouncedQuery}&quot; <button onClick={() => setSearchQuery('')}>✕</button></span>}
                    {verifiedOnly && <span className="bg-green-100 text-green-700 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">Verified <button onClick={() => setVerifiedOnly(false)}>✕</button></span>}
                    {selectedCountry && <span className="bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">{selectedCountry} <button onClick={() => setSelectedCountry('')}>✕</button></span>}
                    {selectedSkills.map(s => <span key={s} className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">{s} <button onClick={() => toggleSkill(s)}>✕</button></span>)}
                    {badgeFilter && <span className="bg-violet-100 text-violet-700 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">{RECOGNITION_BADGES[badgeFilter].label} <button onClick={() => setBadgeFilter('')}>✕</button></span>}
                  </div>
                )}
              </div>

              <select aria-label="Sort AI Solutions" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer shadow-sm hover:border-slate-300">
                <option value="relevant">Sort: Most Relevant</option>
                <option value="top">Sort: Top Experts</option>
                <option value="verified">Sort: Verified</option>
                <option value="reputation">Sort: Highest Rating</option>
                <option value="projects">Sort: Most Projects</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <SolutionCardGrid>
            {[...Array(8)].map((_, i) => <ServiceCardSkeleton key={i} index={i} />)}
          </SolutionCardGrid>
        ) : filteredServices.length === 0 ? (
          <div className="animate-in fade-in duration-500">
            <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-5 ring-1 ring-blue-100/80 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">No exact match found. Showing similar AI experts.</h3>
                <p className="mt-1 text-sm text-slate-500">Try adjusting filters or search terms for more precise results.</p>
              </div>
              <button onClick={clearFilters} className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                Clear Filters
              </button>
            </div>

            <SolutionCardGrid>
              {fallbackServices.map((service) => (
                <ServiceCard
                  key={service.service_id}
                  service={service}
                  recognitionBadge={getPrimary(service.builder_id)}
                />
              ))}
            </SolutionCardGrid>
          </div>
        ) : (
          <>
            <SolutionCardGrid>
              {filteredServices.slice(0, visibleExperts).map((service) => (
                <ServiceCard
                  key={service.service_id}
                  service={service}
                  recognitionBadge={getPrimary(service.builder_id)}
                />
              ))}
            </SolutionCardGrid>

            {visibleExperts < filteredServices.length && (
              <div className="mt-12 text-center">
                <button onClick={() => setVisibleExperts(prev => prev + 24)} className="bg-white hover:bg-slate-50 text-slate-900 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-slate-200 shadow-sm">
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
