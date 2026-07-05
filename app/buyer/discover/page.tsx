"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { ExpertServiceCard } from '@/components/discover/ExpertServiceCard';
import { ExpertServiceCardSkeleton } from '@/components/discover/ExpertServiceCardSkeleton';
import CustomProjectModal from '@/components/CustomProjectModal';
import type { ServiceCardData } from '@/types/marketplace';
import { pickDisplayableImageUrl } from '@/lib/images';

// --- CONSTANTS ---
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

const COMPONENT_CATEGORIES = [
  'All', 'Generative Prompts', 'Autonomous Agents', 'RAG Architectures',
  'Fine-Tuned Models', 'Computer Vision', 'UI/UX AI Assets', 'Data Pipelines', 'Other'
];

// --- VERIFICATION RULES ---
const isVerifiedExpert = (completedCount: number) => completedCount >= 1;
const isTopExpert = (completedCount: number) => completedCount >= 10;

function DiscoverContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'experts' | 'components'>(searchParams.get('tab') as 'experts' | 'components' || 'experts');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);

  const [allServices, setAllServices] = useState<ServiceCardData[]>([]);
  const [allComponents, setAllComponents] = useState<any[]>([]);
  const [semanticResults, setSemanticResults] = useState<any[] | null>(null);

  const [visibleExperts, setVisibleExperts] = useState(24);
  const [visibleComponents, setVisibleComponents] = useState(24);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [componentSearch, setComponentSearch] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [debouncedCompQuery, setDebouncedCompQuery] = useState(componentSearch);

  const [selectedSkills, setSelectedSkills] = useState<string[]>(searchParams.get('skills')?.split(',').filter(Boolean) || []);
  const [skillSearch, setSkillSearch] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>(searchParams.get('min') ? Number(searchParams.get('min')) : '');
  const [maxPrice, setMaxPrice] = useState<number | ''>(searchParams.get('max') ? Number(searchParams.get('max')) : '');
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevant');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customModal, setCustomModal] = useState<{ builderId: string; serviceId?: string; name?: string } | null>(null);
  const [maxDeliveryDays, setMaxDeliveryDays] = useState<number | ''>(searchParams.get('delivery') ? Number(searchParams.get('delivery')) : '');
  const [savedExpertIds, setSavedExpertIds] = useState<Set<string>>(new Set());

  // Fetch saved experts
  useEffect(() => {
    async function loadSaved() {
      if (!currentUser) return;
      const { data } = await supabase.from('saved_experts').select('expert_id').eq('buyer_id', currentUser.id);
      if (data) setSavedExpertIds(new Set(data.map(d => d.expert_id)));
    }
    loadSaved();
  }, [currentUser]);

  const toggleSaveExpert = async (e: React.MouseEvent, expertId: string) => {
    e.stopPropagation();
    if (!currentUser) { router.push('/auth'); return; }

    const isSaved = savedExpertIds.has(expertId);
    setSavedExpertIds(prev => {
      const newSet = new Set(prev);
      isSaved ? newSet.delete(expertId) : newSet.add(expertId);
      return newSet;
    });

    if (isSaved) {
      await supabase.from('saved_experts').delete().eq('buyer_id', currentUser.id).eq('expert_id', expertId);
    } else {
      await supabase.from('saved_experts').insert({ buyer_id: currentUser.id, expert_id: expertId });
    }
  };

  // --- DEBOUNCE LOGIC ---
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCompQuery(componentSearch), 300);
    return () => clearTimeout(timer);
  }, [componentSearch]);

  useEffect(() => {
    if (!componentSearch.trim()) setSemanticResults(null);
  }, [componentSearch]);

  // --- URL SYNC ENGINE ---
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'experts') params.set('tab', activeTab);
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (selectedSkills.length > 0) params.set('skills', selectedSkills.join(','));
    if (minPrice !== '') params.set('min', minPrice.toString());
    if (maxPrice !== '') params.set('max', maxPrice.toString());
    if (selectedCountry) params.set('country', selectedCountry);
    if (verifiedOnly) params.set('verified', 'true');
    if (maxDeliveryDays !== '') params.set('delivery', maxDeliveryDays.toString());
    if (sortBy !== 'relevant') params.set('sort', sortBy);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, debouncedQuery, selectedSkills, minPrice, maxPrice, selectedCountry, verifiedOnly, sortBy, maxDeliveryDays, pathname, router]);

  useEffect(() => { updateURL(); }, [updateURL]);

  // --- DATA FETCHING ENGINE ---
  useEffect(() => {
    async function fetchMarketplace() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

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

        const { data: comps } = await supabase
          .from('components')
          .select('*')
          .eq('status', 'published')
          .gte('price_usd', 0);

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
        setAllComponents((comps || []).filter((component) => {
          const hasPublicBasics = Boolean(component.id && component.title && component.description);
          const hasFulfillment = component.delivery_method === 'secure_text'
            ? Boolean(component.secure_payload_text)
            : Boolean(component.asset_file_path || component.file_url);
          return hasPublicBasics && hasFulfillment;
        }));
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

  const handleSemanticSearch = async () => {
    if (!componentSearch.trim()) return;
    setSemanticLoading(true);
    setActiveTab('components');

    try {
      const response = await fetch('/api/embed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: componentSearch }) });
      if (!response.ok) throw new Error("Embedding generation failed");
      const { embedding } = await response.json();

      const { data, error } = await supabase.rpc('match_components', { query_embedding: embedding, match_threshold: 0.70, match_count: 20 });
      if (error) throw error;
      setSemanticResults(data && data.length > 0 ? data : null);
    } catch (error) {
      console.warn("Semantic Search Failed. Falling back to keyword search.", error);
      setSemanticResults(null);
    } finally {
      setSemanticLoading(false);
    }
  };

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

  const handleViewService = useCallback((serviceId: string) => {
    if (!currentUser) router.push('/auth');
    else router.push(`/service/${serviceId}`);
  }, [currentUser, router]);

  const handleRequestCustomProject = useCallback((builderId: string, serviceId?: string) => {
    if (!currentUser) { router.push('/auth'); return; }
    const svc = allServices.find((s) => s.builder_id === builderId);
    setCustomModal({ builderId, serviceId, name: svc?.full_name });
  }, [currentUser, router, allServices]);

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

  // --- POLISHED: ALGORITHM SORTING ---
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
  }, [allServices, debouncedQuery, selectedSkills, verifiedOnly, selectedCountry, minPrice, maxPrice, maxDeliveryDays, sortBy, getServiceScore]);

  const fallbackServices = useMemo(
    () => [...allServices].sort((a, b) => b.completed_projects - a.completed_projects).slice(0, 8),
    [allServices]
  );

  const displayComponents = useMemo(() => {
    let result = semanticResults ? semanticResults : allComponents;
    if (!semanticResults && debouncedCompQuery) {
      const q = debouncedCompQuery.toLowerCase();
      result = result.filter(c => c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q));
    }
    if (selectedCategory !== 'All') result = result.filter(c => c.category === selectedCategory);
    return result;
  }, [allComponents, semanticResults, debouncedCompQuery, selectedCategory]);

  const clearFilters = () => {
    setSelectedSkills([]); setMinPrice(''); setMaxPrice(''); setSelectedCountry('');
    setVerifiedOnly(false); setSearchQuery(''); setSortBy('relevant'); setMaxDeliveryDays('');
  };

  const toggleSkill = (skill: string) => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  const ComponentSkeletonCard = () => (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4 animate-pulse">
      <div className="aspect-[4/3] bg-slate-200 rounded-2xl w-full" />
      <div className="h-4 bg-slate-200 rounded w-1/2" />
      <div className="h-20 bg-slate-200 rounded w-full" />
      <div className="h-10 bg-slate-200 rounded w-full mt-auto" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-blue-200 selection:text-blue-900">
      
      <div className="bg-slate-900 text-white relative border-b border-slate-800">
        <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-16 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 w-full text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
              Buy <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-400">AI services</span> or request custom work.
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-medium max-w-xl mx-auto md:mx-0">
              Discover fixed-price AI services from vetted experts, or launch a custom project when your idea needs a tailored build.
            </p>
          </div>
          <div className="flex-1 w-full max-w-xl relative">
            <input
              type="text"
              value={activeTab === 'experts' ? searchQuery : componentSearch}
              onChange={(e) => {
                activeTab === 'experts' ? setSearchQuery(e.target.value) : setComponentSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => { if (e.key === 'Enter' && activeTab === 'components') handleSemanticSearch(); }}
              placeholder={activeTab === 'experts' ? "Search AI services or experts..." : "Describe the AI architecture you need..."}
              aria-label="Search Marketplace"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-2xl pl-5 pr-28 py-4 outline-none focus:border-blue-500 transition-colors shadow-inner font-medium text-sm"
            />
            <button
              onClick={() => activeTab === 'components' ? handleSemanticSearch() : null}
              className="absolute inset-y-1.5 right-1.5 bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors shadow-md"
            >
              {semanticLoading ? 'Scanning...' : 'Search'}
            </button>
            {showSuggestions && activeTab === 'experts' && searchSuggestions.length > 0 && (
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

      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <div className="flex gap-8">
            <button onClick={() => { setActiveTab('experts'); setComponentSearch(''); }} className={`py-4 text-xs md:text-sm font-black uppercase tracking-widest transition-colors relative ${activeTab === 'experts' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
              AI Services
              {activeTab === 'experts' && <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></span>}
            </button>
            <button onClick={() => { setActiveTab('components'); setSearchQuery(''); }} className={`py-4 text-xs md:text-sm font-black uppercase tracking-widest transition-colors relative ${activeTab === 'components' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
              AI Assets
              {activeTab === 'components' && <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></span>}
            </button>
          </div>
          <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="md:hidden flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg> Filters
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        {activeTab === 'experts' && (
          <aside className={`w-full md:w-64 shrink-0 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm sticky top-20">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Filters</h3>
                <button onClick={clearFilters} className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500">Clear</button>
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
        )}

        {activeTab === 'components' && (
          <aside className={`w-full md:w-64 shrink-0 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm sticky top-20">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">Categories</h3>
              <div className="flex flex-col gap-1">
                {COMPONENT_CATEGORIES.map(category => (
                  <button key={category} onClick={() => setSelectedCategory(category)} className={`text-left px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${selectedCategory === category ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0">
          {activeTab === 'experts' && (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  {(debouncedQuery || verifiedOnly || selectedCountry || selectedSkills.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {debouncedQuery && <span className="bg-slate-900 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">"{debouncedQuery}" <button onClick={() => setSearchQuery('')}>✕</button></span>}
                      {verifiedOnly && <span className="bg-green-100 text-green-700 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">Verified <button onClick={() => setVerifiedOnly(false)}>✕</button></span>}
                      {selectedCountry && <span className="bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">{selectedCountry} <button onClick={() => setSelectedCountry('')}>✕</button></span>}
                      {selectedSkills.map(s => <span key={s} className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">{s} <button onClick={() => toggleSkill(s)}>✕</button></span>)}
                    </div>
                  )}
                </div>

                <select aria-label="Sort Experts" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer shadow-sm hover:border-slate-300">
                  <option value="relevant">Sort: Most Relevant</option>
                  <option value="top">Sort: Top Experts</option>
                  <option value="verified">Sort: Verified</option>
                  <option value="reputation">Sort: Highest Rating</option>
                  <option value="projects">Sort: Most Projects</option>
                </select>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
                  {[...Array(8)].map((_, i) => <ExpertServiceCardSkeleton key={i} index={i} />)}
                </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
                    {fallbackServices.map((expert, idx) => (
                      <ExpertServiceCard
                        key={expert.service_id}
                        expert={expert}
                        index={idx}
                        onViewService={handleViewService}
                        onRequestCustomProject={handleRequestCustomProject}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
                    {filteredServices.slice(0, visibleExperts).map((expert, idx) => (
                      <ExpertServiceCard
                        key={expert.service_id}
                        expert={expert}
                        index={idx}
                        onViewService={handleViewService}
                        onRequestCustomProject={handleRequestCustomProject}
                      />
                    ))}
                  </div>

                  {visibleExperts < filteredServices.length && (
                    <div className="mt-12 text-center">
                      <button onClick={() => setVisibleExperts(prev => prev + 24)} className="bg-white hover:bg-slate-50 text-slate-900 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-slate-200 shadow-sm">
                        Load More Experts
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'components' && (
            <>
              {semanticResults && (
                <div className="flex justify-between items-center mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Semantic Match: "{debouncedCompQuery}"
                  </p>
                  <button onClick={() => { setComponentSearch(''); setSemanticResults(null); }} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors">Clear Vector Search</button>
                </div>
              )}

              {loading || semanticLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <ComponentSkeletonCard /><ComponentSkeletonCard /><ComponentSkeletonCard />
                </div>
              ) : displayComponents.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center animate-in fade-in">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-4 border-slate-100">
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">No assets matched.</h3>
                  <button onClick={() => { setComponentSearch(''); setSemanticResults(null); setSelectedCategory('All'); }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest mt-4 transition-colors">Reset Engine</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayComponents.slice(0, visibleComponents).map((comp, idx) => (
                      <div key={comp.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 50}ms` }} onClick={() => router.push(`/buyer/components/${comp.id}`)}>
                        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                          {comp.thumbnail_url ? (
                            <Image src={comp.thumbnail_url} loading="lazy" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" alt={comp.title} className="object-cover transition-transform duration-700 hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200">
                              <span className="text-slate-400 text-xs font-bold">No Image</span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                            <span className="bg-white/95 backdrop-blur shadow-sm text-slate-900 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">{comp.category}</span>
                            {comp.price_usd === 0 && (
                              <span className="bg-green-500 text-white shadow-sm px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1">Open Source</span>
                            )}
                          </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                          <h4 className="text-base font-black text-slate-900 mb-1 leading-tight line-clamp-1">{comp.title}</h4>
                          <p className="text-[10px] font-medium text-slate-500 line-clamp-2 mb-4 flex-1">{comp.description}</p>

                          <div onClick={(e) => e.stopPropagation()} className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                              {comp.price_usd === 0 ? <p className="text-lg font-black text-green-600 leading-none">FREE</p> : <p className="text-lg font-black text-slate-900 leading-none">${comp.price_usd}</p>}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/checkout/asset/${comp.id}`);
                              }}
                              className="bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors"
                            >
                              {comp.price_usd === 0 ? 'Get Free' : 'Purchase'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {visibleComponents < displayComponents.length && (
                    <div className="mt-12 text-center">
                      <button onClick={() => setVisibleComponents(prev => prev + 24)} className="bg-white hover:bg-slate-50 text-slate-900 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-slate-200 shadow-sm">
                        Load More Assets
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>

      {customModal && (
        <CustomProjectModal
          builderId={customModal.builderId}
          serviceId={customModal.serviceId}
          builderName={customModal.name}
          onClose={() => setCustomModal(null)}
          onSuccess={(cid) => router.push(`/buyer/messages?conversation=${cid}`)}
        />
      )}
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