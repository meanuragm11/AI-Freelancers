"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // NEW: Buyer Action States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [workHistory, setWorkHistory] = useState<any[]>([]);

  // Editing States
  const [selectedTech, setSelectedTech] = useState(EXHAUSTIVE_AI_TECH_STACK[0]);
  const [customTech, setCustomTech] = useState('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Avatar States
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Portfolio States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', url: '', file_name: '' });

  useEffect(() => {
    async function initializeProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        
        let targetId = id;

        if (id === 'me') {
          if (!user) { router.push('/auth'); return; }
          targetId = user.id;
          setIsOwner(true);
        } else {
          setIsOwner(!!user && user.id === id);
        }

        // 1. Fetch Profile
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, full_name, headline, location, bio, tech_stack, external_projects, avatar_url, banner_url')
          .eq('id', targetId)
          .single();

        if (!error && profileData) {
          setProfile({
            ...profileData,
            location: profileData.location || COUNTRIES[76],
            tech_stack: profileData.tech_stack || [],
            external_projects: profileData.external_projects || [],
          });
          setBannerPreview(profileData.banner_url || '');
          setAvatarPreview(profileData.avatar_url || '');
        }

        // 2. Fetch Completed Work History
        const { data: historyData } = await supabase
          .from('collabs')
          .select('id, title, description, feedback, rating, created_at')
          .eq('builder_id', targetId)
          .eq('status', 'completed');

        if (historyData) setWorkHistory(historyData);

        // 3. NEW: Check if current visitor has saved this expert
        if (!isOwner && user) {
          const { data: savedData } = await supabase
            .from('saved_experts')
            .select('id')
            .eq('buyer_id', user.id)
            .eq('expert_id', targetId)
            .maybeSingle();
            
          if (savedData) setIsSaved(true);
        }

      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setLoading(false);
      }
    }
    initializeProfile();
  }, [id, router]);

  // --- Handlers ---
  const handleSaveProfile = async () => {
    setIsEditing(false);
    try {
      await supabase.from('profiles').update({
        full_name: profile.full_name,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        tech_stack: profile.tech_stack,
        banner_url: bannerPreview,
        avatar_url: avatarPreview
      }).eq('id', profile.id);
      alert("Profile securely updated.");
    } catch (error: any) {
      alert("Update failed: " + error.message);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  // --- Project Handlers ---
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim() || !newProject.description.trim()) { alert("Project Name and Description are required."); return; }

    const updatedProjects = [...profile.external_projects, { ...newProject, id: Date.now().toString() }];
    setProfile({ ...profile, external_projects: updatedProjects });
    await supabase.from('profiles').update({ external_projects: updatedProjects }).eq('id', profile.id);

    setNewProject({ title: '', description: '', url: '', file_name: '' });
    setShowProjectModal(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Delete this project from your portfolio?")) return;
    const updatedProjects = profile.external_projects.filter((p: any) => p.id !== projectId);
    setProfile({ ...profile, external_projects: updatedProjects });
    await supabase.from('profiles').update({ external_projects: updatedProjects }).eq('id', profile.id);
  };

  // --- NEW: Buyer Action Handlers ---
  const toggleSaveExpert = async () => {
    if (!currentUser) { router.push('/auth'); return; }
    
    // Optimistic Update
    const currentlySaved = isSaved;
    setIsSaved(!currentlySaved);

    if (currentlySaved) {
      await supabase.from('saved_experts').delete().eq('buyer_id', currentUser.id).eq('expert_id', profile.id);
    } else {
      await supabase.from('saved_experts').insert({ buyer_id: currentUser.id, expert_id: profile.id });
    }
  };

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center font-bold uppercase tracking-widest text-slate-400">Synchronizing Ledger...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">

      {/* EDITABLE BANNER SECTION */}
      <div className="h-48 md:h-72 w-full relative bg-slate-900 group shadow-inner">
        <img src={bannerPreview || 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=1200&h=400'} alt="Cover" className="w-full h-full object-cover opacity-60" />
        {isOwner && isEditing && (
          <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer transition-all hover:bg-black/50">
            <svg className="w-10 h-10 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-white text-xs font-black uppercase tracking-widest">Update Cover Photo</span>
            <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
          </label>
        )}
      </div>

      <div className="max-w-[1100px] mx-auto px-6 relative -mt-20 md:-mt-24">

        {/* CORE IDENTITY CARD */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 mb-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">

            {/* EDITABLE AVATAR */}
            <div className="w-36 h-32 md:w-44 md:h-44 rounded-3xl border-4 border-white bg-slate-100 shadow-lg flex-shrink-0 overflow-hidden relative group">
              <img src={avatarPreview || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400'} alt="Avatar" className="w-full h-full object-cover" />
              {isOwner && isEditing && (
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer transition-all hover:bg-black/50">
                  <svg className="w-6 h-6 text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-white text-[10px] font-black uppercase tracking-widest text-center">Change</span>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="flex-1 w-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-full pr-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                        <input type="text" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="text-2xl md:text-3xl font-black text-slate-900 bg-slate-50 border-b-2 border-blue-500 w-full outline-none py-1 px-2 rounded-t-lg" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Professional Headline</label>
                        <input type="text" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} className="text-base font-bold text-blue-600 bg-slate-50 border-b-2 border-slate-200 w-full outline-none py-1 px-2 rounded-t-lg" placeholder="Headline" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Country of Residence</label>
                        <select value={profile.location || COUNTRIES[76]} onChange={(e) => setProfile({ ...profile, location: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-medium text-slate-900 outline-none cursor-pointer focus:border-blue-500 transition-colors">
                          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{profile.full_name}</h1>
                      <p className="text-lg font-bold text-blue-600 mt-1">{profile.headline}</p>
                      <p className="text-sm font-bold text-slate-500 mt-3 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {profile.location || 'Location Not Specified'}
                      </p>
                    </div>
                  )}
                </div>

                {/* MODIFIED: Contextual Action Buttons */}
                <div className="shrink-0">
                  {isOwner ? (
                    <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border ${isEditing ? 'bg-green-500 text-white border-green-600 hover:bg-green-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white'}`}>
                      {isEditing ? 'Save Profile' : 'Edit Profile'}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button onClick={() => router.push(`/buyer/collabs/new?builderId=${profile.id}`)} className="w-full bg-slate-900 hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors">
                        Hire Expert
                      </button>
                      <button onClick={toggleSaveExpert} className={`w-full px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border flex items-center justify-center gap-2 ${isSaved ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                        {isSaved ? '★ Saved to Rolodex' : '☆ Save Expert'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* SIDEBAR: BIO & TECH */}
          <div className="space-y-10">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Professional Bio</h3>
              {isEditing ? (
                <textarea rows={8} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="w-full bg-slate-50 p-3 text-sm font-medium text-slate-900 outline-none rounded-xl resize-none border border-slate-200 focus:border-blue-500" placeholder="Tell us about yourself..." />
              ) : (
                <p className="text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap">{profile.bio || 'No bio provided.'}</p>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.tech_stack.length === 0 ? <p className="text-xs font-medium text-slate-400">No tools selected.</p> : profile.tech_stack.map((tech: string, i: number) => (
                  <span key={i} className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    {tech}
                    {isOwner && isEditing && <button onClick={() => setProfile({ ...profile, tech_stack: profile.tech_stack.filter((x: any) => x !== tech) })} className="hover:text-red-500">✕</button>}
                  </span>
                ))}
              </div>
              {isOwner && isEditing && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold outline-none cursor-pointer">
                      {EXHAUSTIVE_AI_TECH_STACK.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button onClick={() => { const skill = selectedTech === "Other (Custom)" ? customTech.trim() : selectedTech; if (!skill) return; if (!profile.tech_stack.includes(skill)) setProfile({ ...profile, tech_stack: [...profile.tech_stack, skill] }); if (selectedTech === "Other (Custom)") setCustomTech(""); }} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">+</button>
                  </div>

                  {selectedTech === "Other (Custom)" && (
                    <input
                      type="text"
                      value={customTech}
                      onChange={(e) => setCustomTech(e.target.value)}
                      placeholder="Enter your custom skill"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT: PROJECTS & HISTORY */}
          <div className="md:col-span-2 space-y-12">

            {/* PROJECTS SECTION */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Portfolio Projects</h3>
                {isOwner && <button onClick={() => setShowProjectModal(true)} className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-4 py-2 rounded-xl shadow-md hover:bg-blue-700 transition-colors">+ Add New</button>}
              </div>

              <div className="space-y-6">
                {profile.external_projects.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold uppercase text-[10px] tracking-widest">Awaiting First Entry</div>
                ) : (
                  profile.external_projects.map((proj: any) => (
                    <div key={proj.id} className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200 group hover:border-blue-300 transition-all">
                      <h4 className="text-base font-black text-slate-900 mb-1 pr-6">{proj.title}</h4>
                      <p className="text-sm text-slate-600 font-medium mb-4">{proj.description}</p>
                      <div className="flex gap-3">
                        {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-100/50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">🔗 Live View</a>}
                        {proj.file_name && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-lg">📎 {proj.file_name}</span>}
                      </div>
                      {isOwner && <button onClick={() => handleDeleteProject(proj.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ZELANCE WORK HISTORY */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 border-b border-slate-100 pb-4">Zelance Platform History</h3>

              <div className="space-y-6">
                {workHistory.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No work history found on Zelance</p>
                  </div>
                ) : (
                  workHistory.map((work) => (
                    <div key={work.id} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest border-l border-b border-green-100 rounded-bl-xl">Verified Completion</div>
                      <h4 className="text-lg font-black text-slate-900 mb-1">{work.title}</h4>
                      <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">{work.description}</p>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className={`w-3.5 h-3.5 ${i < work.rating ? 'fill-current' : 'text-slate-300 fill-none'}`} viewBox="0 0 20 20" stroke="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            ))}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buyer Review</span>
                        </div>
                        <p className="text-sm italic text-slate-600 font-medium">"{work.feedback || 'The project was delivered on time and exceeded expectations.'}"</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* PORTFOLIO MODAL */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Add Portfolio Project</h3>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddProject} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project Name <span className="text-red-500">*</span></label>
                <input required type="text" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} placeholder="e.g., Zatora CRM" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Description <span className="text-red-500">*</span></label>
                <textarea required rows={3} value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} placeholder="What did you build?" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project URL (Optional)</label>
                <input type="url" value={newProject.url} onChange={(e) => setNewProject({ ...newProject, url: e.target.value })} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all shadow-inner" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowProjectModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-blue-600 transition-colors">Add Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}