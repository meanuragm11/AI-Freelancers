"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos",
  "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi",
  "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova",
  "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania",
  "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const EXHAUSTIVE_AI_TECH_STACK = [
  "Generative AI", "Prompt Engineering", "AI Agent Development", "Agentic AI", "AI Automation",
  "AI Workflow Design", "LLM Integration", "RAG Architecture", "Fine-Tuning (LoRA/QLoRA)",
  "Model Evaluation", "Model Distillation", "AI Chatbot Development", "AI Voice Agents",
  "AI Video Generation", "AI Image Generation", "AI Content Creation", "AI Product Development",
  "Vibe Coding", "Cursor AI", "Claude Code", "GitHub Copilot", "Bolt.new", "Lovable", "v0 by Vercel",
  "Replit AI", "Windsurf", "MCP (Model Context Protocol)", "A2A Protocol", "Prompt Chaining",
  "LangChain", "LlamaIndex", "CrewAI", "AutoGen", "LangGraph", "Semantic Kernel", "Haystack",
  "OpenAI API", "Anthropic API", "Google Gemini API", "Groq API", "Mistral API", "DeepSeek API",
  "PyTorch", "TensorFlow", "Scikit-learn", "Hugging Face", "Python", "FastAPI", "Node.js", "Express.js",
  "React", "Next.js", "TypeScript", "Pinecone", "Weaviate", "Qdrant", "ChromaDB", "FAISS",
  "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "MLOps", "Other (Custom)"
];

const PLATFORM_FLAT_FEE = 5;

// Sidebar Icons
const Icons = {
  Overview: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Projects: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Assets: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Messages: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Finances: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Profile: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
};

type DashboardView = 'overview' | 'projects' | 'assets' | 'messages' | 'finances' | 'settings';

export default function UnifiedBuilderWorkspace() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  const [stats, setStats] = useState({ activeCollabs: 0, pendingEscrows: 0, netEarnings: 0, componentSales: 0 });
  const [recentCollabs, setRecentCollabs] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  const [projectTabFilter, setProjectTabFilter] = useState<'all' | 'active' | 'completed'>('all');

  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSavingComponent, setIsSavingComponent] = useState(false);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '', headline: '', location: COUNTRIES[76], bio: '', base_price_usd: 150,
    unlimited_revisions: false, included_revisions: 1, extra_revision_price_usd: 25,
    tech_stack: [] as string[], external_projects: [] as any[]
  });

  const [selectedTech, setSelectedTech] = useState(EXHAUSTIVE_AI_TECH_STACK[0]);
  const [customTech, setCustomTech] = useState('');

  useEffect(() => {
    let realtimeChannel: any;

    async function initializeWorkspace() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/auth'); return; }
      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        if (profileData.is_freelancer) {
          setIsFreelancer(true);
          await loadDashboardData(currentUser.id);

          realtimeChannel = supabase.channel('builder_dashboard_sync')
            .on('postgres', { event: '*', schema: 'public', table: 'collabs', filter: `builder_id=eq.${currentUser.id}` }, () => loadDashboardData(currentUser.id))
            .on('postgres', { event: '*', schema: 'public', table: 'components', filter: `builder_id=eq.${currentUser.id}` }, () => loadDashboardData(currentUser.id))
            .subscribe();
        } else {
          setFormData(prev => ({
            ...prev,
            full_name: profileData.full_name || '',
            headline: profileData.headline || '',
            location: profileData.location || COUNTRIES[76],
            bio: profileData.bio || '',
            tech_stack: profileData.tech_stack || [],
            base_price_usd: profileData.base_price_usd || 150,
            unlimited_revisions: profileData.unlimited_revisions || false,
            included_revisions: profileData.included_revisions || 1,
            extra_revision_price_usd: profileData.extra_revision_price_usd || 25,
            external_projects: profileData.external_projects || []
          }));
        }
      }
      setLoading(false);
    }

    initializeWorkspace();
    return () => { if (realtimeChannel) supabase.removeChannel(realtimeChannel); };
  }, [router]);

  useEffect(() => {
    if (loading || !user || isFreelancer) return;

    const autoSaveDraft = setTimeout(async () => {
      setIsAutoSaving(true);
      const payload = {
        id: user.id, full_name: formData.full_name, headline: formData.headline, location: formData.location,
        bio: formData.bio, tech_stack: formData.tech_stack, base_price_usd: formData.base_price_usd,
        unlimited_revisions: formData.unlimited_revisions, included_revisions: formData.included_revisions,
        extra_revision_price_usd: formData.extra_revision_price_usd, external_projects: formData.external_projects
      };
      await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      setIsAutoSaving(false);
    }, 1000);

    return () => clearTimeout(autoSaveDraft);
  }, [formData, user, loading, isFreelancer]);

  const loadDashboardData = async (userId: string) => {
    try {
      const { data: collabs } = await supabase
        .from('collabs')
        .select(`*, profiles!buyer_id(full_name, avatar_url)`)
        .eq('builder_id', userId)
        .order('created_at', { ascending: false });
        
      const { data: comps } = await supabase.from('components').select('*').eq('builder_id', userId);

      if (collabs) setRecentCollabs(collabs);
      if (comps) setInventory(comps);

      let active = 0, pendingCash = 0, netEarned = 0, totalSales = 0;

      collabs?.forEach(c => {
        if (c.status === 'in_progress' || c.status === 'submitted') active++;
        if (c.status === 'funded' || c.status === 'in_progress' || c.status === 'submitted') pendingCash += Number(c.escrow_amount_usd);
        if (c.status === 'completed' || c.status === 'released') netEarned += Number(c.escrow_amount_usd);
      });

      comps?.forEach(c => {
        totalSales += (c.sales_count || 0);
        netEarned += (c.sales_count || 0) * (c.price_usd || 0);
      });

      setStats({ activeCollabs: active, pendingEscrows: pendingCash, netEarnings: netEarned, componentSales: totalSales });
    } catch (err) {
      console.error("Aggregation Error", err);
    }
  };

  const handleAddTech = () => {
    const techToAdd = selectedTech === "Other (Custom)" ? customTech.trim() : selectedTech;
    if (!techToAdd) { alert("Please enter your custom skill."); return; }
    if (!formData.tech_stack.includes(techToAdd)) setFormData({ ...formData, tech_stack: [...formData.tech_stack, techToAdd] });
    setCustomTech("");
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1 && (!formData.full_name.trim() || !formData.headline.trim() || !formData.location.trim())) { alert("Please complete all fields."); return false; }
    if (currentStep === 2 && (!formData.bio.trim() || formData.tech_stack.length === 0)) { alert("Bio and Tech Stack are mandatory."); return false; }
    if (currentStep === 3) {
      if (formData.base_price_usd < 6) { alert("Minimum base project price must be at least $6 USD."); return false; }
      if (!formData.unlimited_revisions && formData.included_revisions < 1) { alert("Must provide at least 1 free revision."); return false; }
    }
    return true;
  };

  const handlePublish = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!validateStep(3)) return;

    setSaving(true);
    try {
      const payload = {
        is_freelancer: true, full_name: formData.full_name, headline: formData.headline, location: formData.location,
        bio: formData.bio, tech_stack: formData.tech_stack, base_price_usd: formData.base_price_usd,
        unlimited_revisions: formData.unlimited_revisions, included_revisions: formData.included_revisions,
        extra_revision_price_usd: formData.extra_revision_price_usd, external_projects: formData.external_projects
      };

      const { error } = await supabase.from("profiles").upsert({ id: user.id, ...payload }, { onConflict: "id" });
      if (error) throw error;

      setProfile({ ...profile, ...payload });
      await loadDashboardData(user.id);
      setIsFreelancer(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      alert("Database Sync Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComponent = async (compId: string) => {
    if (!window.confirm("Permanently delete this component from the marketplace?")) return;
    const { error } = await supabase.from("components").delete().eq("id", compId);
    if (error) { alert(error.message); return; }
    await loadDashboardData(user.id);
  };

  const handleSaveComponentEdit = async () => {
    if (!editingComponentId) return;
    setIsSavingComponent(true);
    const { error } = await supabase.from("components").update({ title: editForm.title, description: editForm.description, price_usd: editForm.price_usd }).eq("id", editingComponentId);
    setIsSavingComponent(false);
    if (error) { alert(error.message); return; }
    setEditingComponentId(null);
    setEditForm({});
    await loadDashboardData(user.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'funded': return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">Escrow Funded</span>;
      case 'in_progress': return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">In Progress</span>;
      case 'submitted': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">Under Review</span>;
      case 'completed': 
      case 'released': return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">Completed</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Authenticating Workspace...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW A: THE ONBOARDING WIZARD
  // ==========================================
  if (!isFreelancer) {
    const netEarnings = Math.max(0, formData.base_price_usd - PLATFORM_FLAT_FEE);
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-6 relative overflow-hidden font-sans pb-32">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="max-w-2xl mx-auto relative z-10">
          
          <button type="button" onClick={() => router.push('/profile/me')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-10">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Back to Profile
          </button>

          <div className="mb-10 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Join the Talent Network</h1>
              <p className="text-slate-500 font-medium text-sm">Complete your profile to accept direct enterprise contracts.</p>
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 flex items-center gap-2">
              {isAutoSaving ? <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Saving...</> : <><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Saved</>}
            </div>
          </div>

          <div className="w-full bg-slate-200 h-1.5 rounded-full mb-10 overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-500 ease-out" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm min-h-[400px] flex flex-col">
            
            {step === 1 && (
              <div className="animate-in fade-in flex-1">
                <h2 className="text-xl font-black text-slate-900 mb-6 border-b border-slate-100 pb-4">1. Core Identity</h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Professional Headline <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.headline} onChange={(e) => setFormData({ ...formData, headline: e.target.value })} placeholder="e.g., Senior AI Engineer" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Location <span className="text-red-500">*</span></label>
                    <select value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer transition-colors">
                      {COUNTRIES.map(country => <option key={country} value={country}>{country}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in flex-1">
                <h2 className="text-xl font-black text-slate-900 mb-6 border-b border-slate-100 pb-4">2. Expertise & Tech Stack</h2>
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Professional Bio <span className="text-red-500">*</span></label>
                    <textarea rows={5} value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Detail your engineering background..." className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Skills <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[60px]">
                      {formData.tech_stack.length === 0 ? <span className="text-xs font-bold text-slate-400">Select technologies below.</span> : formData.tech_stack.map((tech, i) => (
                        <span key={i} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                          {tech} <button type="button" onClick={() => setFormData({ ...formData, tech_stack: formData.tech_stack.filter(t => t !== tech) })} className="hover:text-red-500 transition-colors">✕</button>
                        </span>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-black outline-none flex-1 cursor-pointer transition-colors">
                          {EXHAUSTIVE_AI_TECH_STACK.map((tech) => <option key={tech} value={tech}>{tech}</option>)}
                        </select>
                        <button type="button" onClick={handleAddTech} className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">Add</button>
                      </div>
                      {selectedTech === "Other (Custom)" && (
                        <input type="text" value={customTech} onChange={(e) => setCustomTech(e.target.value)} placeholder="Enter custom skill..." className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in flex-1">
                <h2 className="text-xl font-black text-slate-900 mb-6 border-b border-slate-100 pb-4">3. Pricing & Scope</h2>
                <div className="space-y-8">
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Base Project Minimum (USD) <span className="text-red-500">*</span></label>
                    <div className="relative mb-4">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">$</span>
                      <input type="number" min="6" step="1" value={formData.base_price_usd} onChange={(e) => setFormData({ ...formData, base_price_usd: Number(e.target.value) })} className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl pl-10 pr-4 py-4 text-2xl font-black outline-none shadow-sm transition-colors" />
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Fee</span>
                      <span className="text-xs font-black text-rose-500">-${PLATFORM_FLAT_FEE}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">You Earn</span>
                      <span className="text-lg font-black text-green-600">${netEarnings.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <input type="checkbox" id="unlimited_revisions" checked={formData.unlimited_revisions} onChange={(e) => setFormData({ ...formData, unlimited_revisions: e.target.checked })} className="w-5 h-5 text-blue-600 rounded cursor-pointer border-slate-300" />
                      <label htmlFor="unlimited_revisions" className="text-xs font-black text-slate-700 cursor-pointer">Offer unlimited free revisions</label>
                    </div>
                    {!formData.unlimited_revisions && (
                      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 animate-in fade-in">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Included Revisions</label>
                          <input type="number" min="1" value={formData.included_revisions} onChange={(e) => setFormData({ ...formData, included_revisions: Number(e.target.value) })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Extra Fee ($)</label>
                          <input type="number" min="0" value={formData.extra_revision_price_usd} onChange={(e) => setFormData({ ...formData, extra_revision_price_usd: Number(e.target.value) })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-8 mt-auto border-t border-slate-100 flex items-center justify-between gap-4">
              {step > 1 ? <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">Back</button> : <div></div>}
              {step < 3 ? (
                <button type="button" onClick={() => { if (validateStep(step)) setStep(step + 1); }} className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors">Continue</button>
              ) : (
                <button type="button" onClick={handlePublish} disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors flex items-center gap-2">
                  {saving ? 'Processing...' : 'Activate Profile'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW B: THE MASTER DASHBOARD (BUILDER OS)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-blue-200 selection:text-blue-900">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 sticky top-0 md:h-screen overflow-y-auto hidden-scrollbar z-40">
        
        {/* User Identity */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Operating Expert</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden relative shrink-0 border border-slate-700">
              <Image src={profile?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100'} fill sizes="40px" className="object-cover" alt="User" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-white truncate">{profile?.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-green-400">Available</span>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-2">Workspace</p>
          <button onClick={() => setActiveView('overview')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Overview} Dashboard
          </button>
          <button onClick={() => setActiveView('projects')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'projects' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Projects} My Clients
          </button>
          <button onClick={() => router.push('/builder/inbox')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'messages' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Messages} Inbox
          </button>

          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2 mt-6">Inventory & Sales</p>
          <button onClick={() => setActiveView('assets')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'assets' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Assets} Components
          </button>
          <button onClick={() => setActiveView('finances')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'finances' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {Icons.Finances} Earnings Ledger
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1 mt-auto">
          <Link href="/profile/me" className="w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white">
            {Icons.Profile} Edit Public Profile
          </Link>
        </div>
      </aside>

      {/* DASHBOARD MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">

          {/* =========================================================
              VIEW 1: OVERVIEW
             ========================================================= */}
          {activeView === 'overview' && (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Expert Command Center</h1>
                  <p className="text-sm font-medium text-slate-500 mt-1">Manage active contracts, track earnings, and publish components.</p>
                </div>
                <button onClick={() => router.push('/builder/components/upload')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Publish Component
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Earnings</p>
                  <p className="text-3xl font-black text-green-600">${stats.netEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Locked in Escrow</p>
                  <p className="text-3xl font-black text-slate-900">${stats.pendingEscrows.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active Projects</p>
                  <p className="text-3xl font-black text-blue-600">{stats.activeCollabs}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Asset Sales</p>
                  <p className="text-3xl font-black text-purple-600">{stats.componentSales}</p>
                </div>
              </div>

              {/* Recent Clients Section */}
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Active Contracts
              </h2>
              {recentCollabs.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active contracts found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recentCollabs.slice(0, 4).map(collab => (
                    <div key={collab.id} onClick={() => router.push(`/collab/${collab.id}`)} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 relative">
                             <Image src={collab.profiles?.avatar_url || 'https://via.placeholder.com/100'} fill sizes="32px" className="object-cover" alt="Buyer" />
                           </div>
                           <h3 className="text-lg font-black text-slate-900 line-clamp-1">{collab.title}</h3>
                         </div>
                         <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest shrink-0">{collab.status.replace('_', ' ')}</span>
                       </div>
                       <div className="mt-auto flex justify-between items-end border-t border-slate-100 pt-4">
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Escrow: <span className="text-slate-900 font-black">${collab.escrow_amount_usd}</span></p>
                         <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest">Enter Room →</button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* =========================================================
              VIEW 2: CLIENT LEDGER (PROJECTS)
             ========================================================= */}
          {activeView === 'projects' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Client Ledger</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Manage active contracts, deliver milestones, and secure escrow payouts.</p>
                </div>
              </div>

              {/* Tab Filters */}
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                {['all', 'active', 'completed'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setProjectTabFilter(tab as any)} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${projectTabFilter === tab ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    {tab === 'active' ? 'In Progress' : tab}
                  </button>
                ))}
              </div>

              {recentCollabs.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">No client contracts yet.</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6">When a buyer hires you, the secure escrow contract will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recentCollabs
                    .filter(c => {
                      if (projectTabFilter === 'active') return c.status !== 'completed' && c.status !== 'released';
                      if (projectTabFilter === 'completed') return c.status === 'completed' || c.status === 'released';
                      return true;
                    })
                    .map(collab => (
                    <div key={collab.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
                       
                       <div className="flex justify-between items-start mb-6">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative shrink-0 border border-slate-200">
                             <Image src={collab.profiles?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100'} fill sizes="40px" className="object-cover" alt="Buyer" />
                           </div>
                           <div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Enterprise Client</p>
                             <p className="text-sm font-black text-slate-900 leading-tight">{collab.profiles?.full_name}</p>
                           </div>
                         </div>
                         {getStatusBadge(collab.status)}
                       </div>

                       <div className="mb-6 flex-1">
                         <h3 className="text-lg font-black text-slate-900 line-clamp-1 mb-1">{collab.title}</h3>
                         <p className="text-xs font-medium text-slate-500 line-clamp-2">{collab.description}</p>
                       </div>

                       <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                         <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secured Escrow</p>
                           <p className="text-lg font-black text-slate-900">${Number(collab.escrow_amount_usd).toLocaleString()}</p>
                         </div>
                         <button onClick={() => router.push(`/collab/${collab.id}`)} className="bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                           Enter Workspace
                         </button>
                       </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              VIEW 3: ASSETS (Components Inventory)
             ========================================================= */}
          {activeView === 'assets' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Component Inventory</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Manage and monetize your reusable AI architectures and scripts.</p>
                </div>
                <button onClick={() => router.push('/builder/components/upload')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Publish Component
                </button>
              </div>

              {inventory.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">No components published yet.</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6">Create passive income by selling your scripts and prompts on the marketplace.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {inventory.map(comp => (
                    <div key={comp.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                      <div className="aspect-video bg-slate-100 relative">
                        <Image src={comp.thumbnail_url || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=600&h=400'} fill className="object-cover" alt="Thumbnail" />
                        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">{comp.category}</span>
                      </div>
                      
                      <div className="p-5 flex flex-col flex-1">
                        {editingComponentId === comp.id ? (
                          <div className="space-y-3 mb-4 flex-1">
                            <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                            <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium resize-none" rows={3} />
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">$</span>
                              <input type="number" value={editForm.price_usd} onChange={e => setEditForm({...editForm, price_usd: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4 flex-1">
                            <h3 className="text-base font-black text-slate-900 mb-1 leading-tight line-clamp-1">{comp.title}</h3>
                            <p className="text-[10px] font-medium text-slate-500 line-clamp-2">{comp.description}</p>
                            <div className="mt-3 flex justify-between items-center">
                               <p className="text-sm font-black text-slate-900">${comp.price_usd}</p>
                               <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Sales: {comp.sales_count || 0}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
                          {editingComponentId === comp.id ? (
                            <>
                              <button onClick={handleSaveComponentEdit} disabled={isSavingComponent} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">{isSavingComponent ? '...' : 'Save'}</button>
                              <button onClick={() => setEditingComponentId(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingComponentId(comp.id); setEditForm({ title: comp.title, description: comp.description, price_usd: comp.price_usd }); }} className="flex-1 bg-slate-900 hover:bg-blue-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">Edit</button>
                              <button onClick={() => handleDeleteComponent(comp.id)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              VIEW 4: FINANCES (Earnings Ledger)
             ========================================================= */}
          {activeView === 'finances' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Earnings Ledger</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Track released funds, pending escrows, and manage bank payouts.</p>
                </div>
                <button className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> Withdraw Funds
                </button>
              </div>

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-8 shadow-lg text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-100 mb-2">Available for Withdrawal</p>
                  <p className="text-4xl font-black">${stats.netEarnings.toLocaleString()}</p>
                  <p className="text-xs font-medium text-green-100 mt-4">Funds cleared from completed milestones and component sales.</p>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pending in Escrow</p>
                  <p className="text-4xl font-black text-slate-900">${stats.pendingEscrows.toLocaleString()}</p>
                  <p className="text-xs font-medium text-slate-500 mt-4">Locked funds held securely in active client contracts.</p>
                </div>
              </div>

              {/* Payout Method & Transaction History */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Bank Connection */}
                <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Payout Method</h3>
                  </div>
                  <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100">
                       <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mb-1">No Connected Account</p>
                    <p className="text-[10px] font-medium text-slate-500 mb-6">Link a bank account or Stripe to withdraw your earnings.</p>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                      Connect Stripe
                    </button>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Recent Transactions</h3>
                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest">Download CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    {recentCollabs.filter(c => c.status === 'completed' || c.status === 'released').length === 0 ? (
                       <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                         No cleared transactions yet.
                       </div>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recentCollabs.filter(c => c.status === 'completed' || c.status === 'released').map(collab => (
                            <tr key={collab.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-500">{new Date(collab.created_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4 font-black text-slate-900">{collab.title} <span className="text-slate-400 font-medium ml-2">Milestone Release</span></td>
                              <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Cleared</span></td>
                              <td className="px-6 py-4 text-right font-black text-green-600">+${Number(collab.escrow_amount_usd).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}