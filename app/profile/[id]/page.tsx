"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "@/components/RemoteImage";
import { supabase } from "@/lib/supabaseClient";
import { uploadMarketplaceFile } from "@/lib/storage/upload";
import {
  fetchProfilePageData,
  incrementProfileViewsIfVisitor,
} from "@/lib/profile";
import { formatResponseTimeLabel, getInitials } from "@/lib/profile/formatters";
import { formatBuilderName } from "@/lib/display/formatBuilderName";
import type {
  BuilderProfileView,
  BuilderPublishedService,
  CompletedProjectReview,
} from "@/types/profile";
import ProfileLoadingSkeleton from "@/components/profile/ProfileLoadingSkeleton";
import ProfileInfoCards from "@/components/profile/ProfileInfoCards";
import ProfileServicesSection from "@/components/profile/ProfileServicesSection";
import ProfilePortfolioSection from "@/components/profile/ProfilePortfolioSection";
import ProfileWorkHistory from "@/components/profile/ProfileWorkHistory";
import { isDisplayableImageUrl } from "@/lib/images";
import { fetchBuilderRecognition } from "@/lib/arena/badges/client";
import RecognitionBadgeList from "@/components/arena/RecognitionBadgeList";
import type { RecognitionBadgeGrant } from "@/lib/arena/badges/types";

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
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
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
  "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "MLOps", "Other (Custom)",
];

const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "German", "Portuguese", "Hindi", "Arabic", "Mandarin", "Japanese", "Other"];

type ProfileTab = "overview" | "services" | "portfolio" | "history";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  const [profile, setProfile] = useState<BuilderProfileView | null>(null);
  const [services, setServices] = useState<BuilderPublishedService[]>([]);
  const [workHistory, setWorkHistory] = useState<CompletedProjectReview[]>([]);
  const [recognitionBadges, setRecognitionBadges] = useState<RecognitionBadgeGrant[]>([]);

  const [selectedTech, setSelectedTech] = useState(EXHAUSTIVE_AI_TECH_STACK[0]);
  const [customTech, setCustomTech] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      let targetId = id;
      let owner = false;

      if (id === "me") {
        if (!user) {
          router.push("/auth");
          return;
        }
        targetId = user.id;
        owner = true;
      } else {
        owner = !!user && user.id === id;
      }
      setIsOwner(owner);

      const pageData = await fetchProfilePageData(targetId);
      if (!pageData) {
        setProfile(null);
        return;
      }

      setProfile(pageData.profile);
      setServices(pageData.services);
      setWorkHistory(pageData.workHistory);
      setBannerPreview(pageData.profile.banner_url || "");
      setAvatarPreview(pageData.profile.avatar_url || "");
      setBannerFile(null);
      setAvatarFile(null);

      try {
        const recognition = await fetchBuilderRecognition(targetId);
        setRecognitionBadges(recognition.badges);
      } catch {
        setRecognitionBadges([]);
      }

      if (!owner) {
        incrementProfileViewsIfVisitor(targetId, false).catch(() => {});
      }

      if (!owner && user) {
        const { data: savedData } = await supabase
          .from("saved_experts")
          .select("id")
          .eq("buyer_id", user.id)
          .eq("expert_id", targetId)
          .maybeSingle();
        setIsSaved(!!savedData);
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as ProfileTab;
    if (["overview", "services", "assets", "portfolio", "history"].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      let bannerUrlToSave = bannerPreview;
      let avatarUrlToSave = avatarPreview;

      if (bannerFile) {
        bannerUrlToSave = await uploadMarketplaceFile(profile.id, "banners", bannerFile);
        setBannerPreview(bannerUrlToSave);
        setBannerFile(null);
      }

      if (avatarFile) {
        avatarUrlToSave = await uploadMarketplaceFile(profile.id, "avatars", avatarFile);
        setAvatarPreview(avatarUrlToSave);
        setAvatarFile(null);
      }

      const { error } = await supabase.from("profiles").update({
        full_name: profile.full_name,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        tech_stack: profile.tech_stack,
        languages: profile.languages,
        availability_status: profile.availability_status,
        banner_url: bannerUrlToSave || null,
        avatar_url: avatarUrlToSave || null,
      }).eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        banner_url: bannerUrlToSave || null,
        avatar_url: avatarUrlToSave || null,
      });
      setIsEditing(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Update failed";
      alert(message);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const toggleSaveExpert = async () => {
    if (!currentUser || !profile) {
      router.push("/auth");
      return;
    }
    const currentlySaved = isSaved;
    setIsSaved(!currentlySaved);
    if (currentlySaved) {
      await supabase.from("saved_experts").delete().eq("buyer_id", currentUser.id).eq("expert_id", profile.id);
    } else {
      await supabase.from("saved_experts").insert({ buyer_id: currentUser.id, expert_id: profile.id });
    }
  };

  const switchTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
    if (tab !== "overview") {
      document.getElementById(tab === "history" ? "work-history" : tab)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) return <ProfileLoadingSkeleton />;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-lg">
          <p className="text-lg font-black text-slate-900">Profile not found</p>
          <p className="mt-2 text-sm text-slate-500">This builder profile does not exist or is unavailable.</p>
          <button
            type="button"
            onClick={() => router.push("/buyer/discover")}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-600"
          >
            Browse Experts
          </button>
        </div>
      </div>
    );
  }

  const bannerUrl = bannerPreview && (bannerPreview.startsWith("blob:") || isDisplayableImageUrl(bannerPreview)) ? bannerPreview : undefined;
  const avatarUrl = avatarPreview && (avatarPreview.startsWith("blob:") || isDisplayableImageUrl(avatarPreview)) ? avatarPreview : undefined;
  const publicDisplayName = isOwner ? profile.full_name : formatBuilderName(profile.full_name);
  const tabs: { id: ProfileTab; label: string; show: boolean }[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "services", label: "AI Solutions", show: true },
    { id: "portfolio", label: "Portfolio", show: true },
    { id: "history", label: "History", show: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Cover */}
      <div className="group relative h-44 w-full bg-slate-900 md:h-64 lg:h-72">
        {bannerUrl ? (
          bannerUrl.startsWith("blob:") ? (
            <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          ) : (
            <Image key={bannerUrl} src={bannerUrl} fill priority className="object-cover opacity-80" alt="" sizes="100vw" />
          )
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        {isOwner && isEditing && (
          <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/40 backdrop-blur-sm transition-all hover:bg-black/50">
            <svg className="mb-2 h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <span className="text-xs font-black uppercase tracking-widest text-white">Update Cover</span>
            <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
          </label>
        )}
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Identity card */}
        <div className="-mt-20 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.08)] md:-mt-24 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="relative -mt-14 h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-xl sm:-mt-16 sm:h-32 sm:w-32 md:h-36 md:w-36 md:rounded-3xl">
                {avatarUrl ? (
                  avatarUrl.startsWith("blob:") ? (
                    <img src={avatarUrl} alt={publicDisplayName} className="h-full w-full object-cover" />
                  ) : (
                    <Image key={avatarUrl} src={avatarUrl} fill className="object-cover" alt={publicDisplayName} sizes="144px" priority />
                  )
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-3xl font-black text-slate-500">
                    {getInitials(profile.full_name)}
                  </span>
                )}
                {isOwner && isEditing && (
                  <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Change</span>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full rounded-xl border-b-2 border-blue-500 bg-slate-50 px-3 py-2 text-2xl font-black text-slate-900 outline-none md:text-3xl"
                    />
                    <input
                      type="text"
                      value={profile.headline || ""}
                      onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                      placeholder="Professional headline"
                      className="w-full rounded-xl border-b-2 border-slate-200 bg-slate-50 px-3 py-2 text-base font-bold text-blue-600 outline-none"
                    />
                    <select
                      value={profile.location || COUNTRIES[76]}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium outline-none"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={profile.availability_status}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          availability_status: e.target.value as BuilderProfileView["availability_status"],
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium outline-none"
                    >
                      <option value="available">Available for new projects</option>
                      <option value="limited">Limited availability</option>
                      <option value="unavailable">Currently unavailable</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-4xl">{publicDisplayName}</h1>
                      {profile.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                          ✓ Verified
                        </span>
                      )}
                      {profile.is_top_expert && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                          ★ Top Expert
                        </span>
                      )}
                    </div>
                    <RecognitionBadgeList badges={recognitionBadges} size="md" className="mt-2" />
                    <p className="mt-1 text-base font-bold text-blue-600 md:text-lg">{profile.headline || "AI Builder on Zelance"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      {profile.location && (
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {profile.location}
                        </span>
                      )}
                      {profile.average_rating > 0 && (
                        <span className="font-bold text-amber-600">
                          ★ {profile.average_rating.toFixed(1)} ({profile.review_count} reviews)
                        </span>
                      )}
                      <span className="text-slate-400">{formatResponseTimeLabel(profile.average_response_hours)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
                  className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                    isEditing
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  {isEditing ? "Save Profile" : "Edit Profile"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/buyer/collabs/new?builderId=${profile.id}`)}
                    className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Request Custom Project
                  </button>
                  <button
                    type="button"
                    onClick={toggleSaveExpert}
                    className={`rounded-xl border px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-all ${
                      isSaved
                        ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {isSaved ? "★ Expert Saved" : "☆ Save Expert"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="sticky top-0 z-20 mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-md">
          <div className="flex min-w-max gap-1">
            {tabs.filter((t) => t.show).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <aside className="space-y-6 lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-widest text-slate-900">
                Professional Bio
              </h3>
              {isEditing ? (
                <textarea
                  rows={8}
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-blue-500"
                  placeholder="Tell buyers about your expertise..."
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {profile.bio || "No bio provided yet."}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-widest text-slate-900">
                Skills
              </h3>
              <div className="mb-4 flex flex-wrap gap-2">
                {profile.tech_stack.length === 0 ? (
                  <p className="text-xs text-slate-400">No skills listed.</p>
                ) : (
                  profile.tech_stack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700"
                    >
                      {tech}
                      {isOwner && isEditing && (
                        <button
                          type="button"
                          onClick={() =>
                            setProfile({
                              ...profile,
                              tech_stack: profile.tech_stack.filter((x) => x !== tech),
                            })
                          }
                          className="hover:text-red-500"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
              {isOwner && isEditing && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedTech}
                      onChange={(e) => setSelectedTech(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold outline-none"
                    >
                      {EXHAUSTIVE_AI_TECH_STACK.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const skill = selectedTech === "Other (Custom)" ? customTech.trim() : selectedTech;
                        if (!skill || profile.tech_stack.includes(skill)) return;
                        setProfile({ ...profile, tech_stack: [...profile.tech_stack, skill] });
                        if (selectedTech === "Other (Custom)") setCustomTech("");
                      }}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                    >
                      +
                    </button>
                  </div>
                  {selectedTech === "Other (Custom)" && (
                    <input
                      type="text"
                      value={customTech}
                      onChange={(e) => setCustomTech(e.target.value)}
                      placeholder="Custom skill"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none"
                    />
                  )}
                  <div className="pt-2">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((lang) => {
                        const selected = profile.languages.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              const next = selected
                                ? profile.languages.filter((l) => l !== lang)
                                : [...profile.languages, lang];
                              setProfile({ ...profile, languages: next });
                            }}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                              selected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <ProfileInfoCards profile={profile} serviceCount={services.length} displayName={publicDisplayName} />
          </aside>

          <main className="space-y-12 lg:col-span-2">
            <ProfileServicesSection services={services} />
            <ProfilePortfolioSection builderId={profile.id} isOwner={isOwner} />
            <ProfileWorkHistory workHistory={workHistory} />
          </main>
        </div>
      </div>
    </div>
  );
}
