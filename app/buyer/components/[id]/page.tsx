"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import RazorpayCheckoutButton from '@/components/RazorpayCheckoutButton';

interface ComponentDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  price_usd: number;
  sales_count: number;
  thumbnail_url: string;
  license_type: string;
  builder_id: string;
}

interface BuilderProfile {
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
}

export default function ComponentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // UNWRAP THE PARAMS PROMISE HERE
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [component, setComponent] = useState<ComponentDetail | null>(null);
  const [builder, setBuilder] = useState<BuilderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acquiring, setAcquiring] = useState(false);

  useEffect(() => {
    async function fetchComponentData() {
      try {
        // 1. Fetch the specific component details using the unwrapped 'id'
        const { data: compData, error: compError } = await supabase
          .from('components')
          .select('*')
          .eq('id', id)
          .eq('status', 'published')
          .single();

        if (compError) throw compError;
        setComponent(compData);

        // 2. Fetch the builder's profile using the builder_id from the component
        if (compData && compData.builder_id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles_public')
            .select('full_name, avatar_url, headline')
            .eq('id', compData.builder_id)
            .single();
            
          if (!profileError && profileData) {
            setBuilder(profileData);
          } else {
            // Fallback if profile is missing
            setBuilder({
              full_name: "Verified Architect",
              avatar_url: null,
              headline: "Elite Mesh Contributor"
            });
          }
        }
      } catch (error) {
        console.error("Error fetching component:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchComponentData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Decrypting Asset Data...</p>
      </div>
    );
  }

  if (!component) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Asset Not Found</h2>
        <p className="text-slate-500 mb-6">This component may have been removed from the mesh.</p>
        <button onClick={() => router.push('/buyer/discover?tab=components')} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest">Return to Discovery</button>
      </div>
    );
  }

  const isFree = component.price_usd === 0;

  const acquireFreeAsset = async () => {
    setAcquiring(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/assets/${component.id}/acquire`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not acquire asset');
      router.push('/buyer/library');
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'Could not acquire asset');
    } finally {
      setAcquiring(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Breadcrumb Navigation */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Mesh
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* High-Res Hero Image */}
            <div className="w-full aspect-[16/9] bg-slate-200 rounded-3xl overflow-hidden shadow-sm border border-slate-200">
              {component.thumbnail_url ? (
                <img src={component.thumbnail_url} alt={component.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-300">
                  <span className="text-slate-400 text-sm font-bold">No Image</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-blue-200">
                  {component.category}
                </span>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-300">
                  {component.license_type || 'Standard Commercial'}
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
                {component.title}
              </h1>

              <div className="prose prose-slate max-w-none">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Technical Architecture & Description</h3>
                <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                  {component.description}
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar (Acquisition & Architect Info) */}
          <div className="space-y-6">
            
            {/* The Acquisition Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl sticky top-24">
              <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Acquisition Price</p>
                  {isFree ? (
                    <p className="text-4xl font-black text-green-600">FREE</p>
                  ) : (
                    <p className="text-4xl font-black text-slate-900">${component.price_usd.toLocaleString('en-US')}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume</p>
                  <p className="text-lg font-black text-blue-600">{component.sales_count} Sales</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Instant Secure Delivery
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Verified Production-Ready
                </div>
                {!isFree && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Razorpay Secure Escrow
                  </div>
                )}
              </div>

              {isFree ? (
                <button 
                  onClick={acquireFreeAsset}
                  disabled={acquiring}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-colors shadow-lg shadow-green-500/20"
                >
                  {acquiring ? 'Adding to Library...' : 'Acquire For Free'}
                </button>
              ) : (
                <RazorpayCheckoutButton 
                  amountUsd={component.price_usd} 
                  itemId={component.id} 
                  transactionType="component_purchase" 
                  buttonText="Acquire Secure Asset" 
                />
              )}
              {actionError && (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                  {actionError}
                </p>
              )}
            </div>

            {/* The Architect Profile Block */}
            {builder && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg group">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4">Architected By</p>
                <div className="flex items-center gap-4 mb-4">
                  {builder.avatar_url ? (
                    <img src={builder.avatar_url} alt={builder.full_name} className="w-16 h-16 rounded-2xl border-2 border-slate-700 object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-lg font-black text-slate-200">
                      {builder.full_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-black text-white">{builder.full_name}</h4>
                    <p className="text-xs font-medium text-slate-400 line-clamp-1">{builder.headline ?? 'Elite Mesh Contributor'}</p>
                  </div>
                </div>
                <Link 
                  href={`/profile/${component.builder_id}`} 
                  className="block w-full text-center bg-slate-800 hover:bg-white hover:text-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                >
                  View Full Profile
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}