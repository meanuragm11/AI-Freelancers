"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

/* ── Inline SVG Icons ── */
const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

export default function DiscoveryHub() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchListings() {
      // Fetch all published tools and join the builder's company name
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles(company_name)')
        .order('created_at', { ascending: false });

      if (data) {
        setTools(data);
      } else {
        console.error("Error fetching tools:", error);
      }
      setLoading(false);
    }
    
    fetchListings();
  }, []);

  // Simple client-side search filter
  const filteredTools = tools.filter(tool => 
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (tool.tags && tool.tags.join(' ').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto font-sans w-full min-h-screen animate-in fade-in duration-500">
      
      {/* ── Header & Search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Discovery Hub</h1>
          <p className="text-base text-slate-500 font-medium mt-1">Browse, evaluate, and deploy enterprise-grade AI tools instantly.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search OCR, RAG, agents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* ── Dynamic Live Grid ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Indexing Secure Marketplace...</p>
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <MagnifyingGlassIcon className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-black text-slate-900 mb-2">No tools found</h2>
          <p className="text-sm text-slate-500 max-w-md">We couldn't find any tools matching your search, or the marketplace is currently empty. Switch to Builder to publish the first tool!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTools.map((tool) => (
            <div key={tool.id} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:border-blue-300 transition-all duration-300 relative overflow-hidden">
              
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {tool.title.substring(0, 2).toUpperCase()}
                  </div>
                  {tool.is_verified ? (
                     <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-green-50 text-green-700 border border-green-200 uppercase tracking-widest">
                       <CheckCircleIcon /> Verified
                     </span>
                  ) : null}
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-1 line-clamp-1">{tool.title}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">By {tool.profiles?.company_name || 'Builder'}</p>
                
                <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-3 mb-6 min-h-[60px]">
                  {tool.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {tool.tags && tool.tags.slice(0, 3).map((tag: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                  {tool.tags && tool.tags.length > 3 && (
                    <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      +{tool.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Starting from</p>
                  <p className="text-2xl font-black text-slate-900">
                    ₹{tool.price.toLocaleString()}<span className="text-xs text-slate-500 font-medium">/mo</span>
                  </p>
                </div>
                <Link 
                  href={`/buyer/tool/${tool.id}`} 
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-md flex items-center gap-1"
                >
                  View Details <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}