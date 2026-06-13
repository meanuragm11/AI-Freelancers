"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/* ── Inline SVG Icons ── */
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const BoltIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

export default function EditTool() {
  const router = useRouter();
  const params = useParams();
  
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'product',
    tags: '',
    demoUrl: '',
    features: '',
    integrations: ''
  });

  // Fetch the existing tool data on mount
  useEffect(() => {
    async function fetchExistingTool() {
      const id = params?.id as string;
      if (!id) return;

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        // Convert array fields back to string formats for the form inputs
        setFormData({
          title: data.title || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          type: data.type || 'product',
          tags: data.tags ? data.tags.join(', ') : '',
          demoUrl: data.demo_url || '',
          features: data.features ? data.features.join('\n') : '',
          integrations: data.integrations ? data.integrations.join(', ') : ''
        });
      } else {
        console.error("Error fetching tool:", error);
      }
      setFetching(false);
    }
    fetchExistingTool();
  }, [params?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    setSaving(true);
    const id = params?.id as string;
    
    // Format text back into arrays for the database
    const tagArray = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const featureArray = formData.features.split('\n').map(f => f.trim()).filter(Boolean);
    const integrationArray = formData.integrations.split(',').map(i => i.trim()).filter(Boolean);

    const { error } = await supabase
      .from('listings')
      .update({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        type: formData.type,
        tags: tagArray,
        demo_url: formData.demoUrl,
        features: featureArray,
        integrations: integrationArray
      })
      .eq('id', id);

    if (!error) {
      router.push('/builder/dashboard');
    } else {
      console.error("Error updating tool:", error);
      setSaving(false);
      alert("Failed to update tool. Check console for details.");
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Loading Tool Details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative">
      
      {/* ── Fixed Header ── */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
            <ArrowLeftIcon />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Edit Tool</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleUpdate}
            disabled={saving || !formData.title || !formData.price}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold tracking-widest hover:bg-blue-700 transition-colors uppercase shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? 'Saving...' : <><BoltIcon /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* ── Main Form ── */}
      <div className="p-6 md:p-10 max-w-3xl mx-auto flex flex-col gap-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-8">
          
          {/* Core Info */}
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-6 border-b border-slate-100 pb-2">Core Identity</h2>
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tool Name</label>
                <input 
                  name="title" value={formData.title} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Value Proposition</label>
                <textarea 
                  name="description" value={formData.description} onChange={handleChange} rows={3}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-6 border-b border-slate-100 pb-2">Technical & Marketing Details</h2>
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Key Features (One per line)</label>
                <textarea 
                  name="features" value={formData.features} onChange={handleChange} rows={4}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none resize-none transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Integrations (Comma separated)</label>
                  <input 
                    name="integrations" value={formData.integrations} onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Search Tags (Comma separated)</label>
                  <input 
                    name="tags" value={formData.tags} onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Deployment */}
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-6 border-b border-slate-100 pb-2">Pricing & Deployment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Monthly Price (₹)</label>
                <input 
                  type="number" name="price" value={formData.price} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Listing Type</label>
                <select 
                  name="type" value={formData.type} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all appearance-none"
                >
                  <option value="product">SaaS / API Product</option>
                  <option value="service">Custom Development</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Demo URL (Optional)</label>
                <input 
                  type="url" name="demoUrl" value={formData.demoUrl} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}