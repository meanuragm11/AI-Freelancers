"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';

export default function AssetLibrary() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    async function fetchLibrary() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      // Fetch purchased assets joined with component details
      const { data, error } = await supabase
        .from('library')
        .select(`
          id,
          license_key,
          purchased_at,
          components (id, title, description, category, thumbnail_url, file_url, version)
        `)
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (data && !error) setAssets(data);
      setLoading(false);
    }
    fetchLibrary();
  }, [router]);

  const categories = ['All', ...Array.from(new Set(assets.map(a => a.components?.category).filter(Boolean)))];
  const filteredAssets = activeCategory === 'All' ? assets : assets.filter(a => a.components?.category === activeCategory);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Decrypting Vault...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <Link href="/buyer/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My AI Assets</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Access, download, and manage your purchased AI components and prompts.</p>
          </div>
          <Link href="/buyer/discover?tab=components" className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors flex items-center gap-2">
             Browse Asset Store
          </Link>
        </div>

        {assets.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Your vault is empty.</h3>
            <p className="text-sm font-medium text-slate-500 mb-6">Purchase AI architectures, agents, and prompts from verified developers.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
              {categories.map((cat: string) => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map(asset => (
                <div key={asset.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col">
                  <div className="aspect-[16/9] bg-slate-100 relative">
                    <Image src={asset.components?.thumbnail_url || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=600&h=400'} fill className="object-cover" alt="Thumbnail" />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest">
                      v{asset.components?.version || '1.0'}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{asset.components?.title}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">{asset.components?.category}</p>
                    
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-6">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">License Key</p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-xs font-mono text-slate-900 truncate">{asset.license_key}</code>
                        <button onClick={() => navigator.clipboard.writeText(asset.license_key)} className="text-slate-400 hover:text-blue-600 transition-colors shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto flex gap-2">
                      <a href={asset.components?.file_url || '#'} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-900 hover:bg-blue-600 text-white text-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                        Download
                      </a>
                      <button className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                        Docs
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}