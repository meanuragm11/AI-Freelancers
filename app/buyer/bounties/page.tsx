"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PostBounty() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', budget: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to post a bounty.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('bounties').insert({
      buyer_id: user.id,
      title: formData.title,
      description: formData.description,
      budget_usd: parseFloat(formData.budget),
      status: 'open'
    });

    if (error) {
      alert("Error posting bounty: " + error.message);
      setLoading(false);
    } else {
      alert("Bounty posted to the Global Board! AI Builders will start bidding shortly.");
      router.push('/buyer/discover');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Post an AI Bounty</h1>
        <p className="text-slate-500 font-medium mb-8">Deploy your capital to the Zelance network. Elite AI builders will bid on your project.</p>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Project Title</label>
            <input required type="text" placeholder="e.g., Need a RAG-based PDF analyzer" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Project Details</label>
            <textarea required rows={5} placeholder="Explain the AI architecture you need built, the tech stack, and your timeline..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Budget (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
              <input required type="number" min="50" placeholder="5000" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Funds will be secured in Zelance Escrow upon hiring.</p>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50">
            {loading ? 'Deploying to Network...' : 'Post Bounty to Global Board'}
          </button>
        </form>
      </div>
    </div>
  );
}