"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmitProposal() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    bidAmount: '',
    scopeLock: '',
    coverLetter: ''
  });

  const FLAT_FEE = 5.00; // Flat $5 fee
  const numericBid = parseFloat(formData.bidAmount) || 0;
  const finalPayout = numericBid > 0 ? numericBid - FLAT_FEE : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    alert("Proposal submitted! If accepted, scope is locked and funds will enter Escrow.");
    router.push('/builder/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Submit Proposal</h1>
        <p className="text-slate-500 font-medium mb-8">Define your scope strictly. This creates the Escrow contract.</p>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Scope Lock (Deliverables)</label>
            <input required placeholder="e.g., I will deliver 1 Next.js dashboard integrating Claude 3.5 API." value={formData.scopeLock} onChange={(e) => setFormData({...formData, scopeLock: e.target.value})} className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" />
            <p className="text-[10px] text-amber-600 font-bold uppercase mt-2 block">⚠️ If the buyer requests work outside this scope, you may demand a new milestone.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Technical Cover Letter (Max 500 Chars)</label>
            <textarea required maxLength={500} rows={4} placeholder="Why are you the exact engineer for this architecture?" value={formData.coverLetter} onChange={(e) => setFormData({...formData, coverLetter: e.target.value})} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none" />
            <p className="text-[10px] text-slate-500 text-right mt-1">{formData.coverLetter.length}/500</p>
          </div>

          <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">Financials (Flat Fee Math)</label>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-slate-900 font-black text-sm">Bid Amount (USD):</span>
              <div className="relative w-1/2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input required type="number" min="50" value={formData.bidAmount} onChange={(e) => setFormData({...formData, bidAmount: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-slate-900 outline-none" />
              </div>
            </div>

            <div className="flex justify-between items-center text-sm mb-2 text-slate-500 font-medium">
              <span>Zelance Platform Fee</span>
              <span className="text-red-500 font-bold">-${FLAT_FEE.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-lg font-black text-slate-900 border-t border-slate-200 pt-3 mt-1">
              <span>You Earn (Cleared Escrow)</span>
              <span className="text-green-600">${finalPayout.toFixed(2)}</span>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50">
            Submit Secured Proposal
          </button>
        </form>
      </div>
    </div>
  );
}