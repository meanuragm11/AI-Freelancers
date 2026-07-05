"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

// We wrap the main content in a component to safely use useSearchParams
function ContractForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const builderId = searchParams.get('builderId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [expert, setExpert] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [escrowAmount, setEscrowAmount] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState<'single_payment' | 'milestone_based'>('single_payment');
  const [milestones, setMilestones] = useState<Array<{ title: string; description: string; amount: number; due_date: string }>>([]);

  useEffect(() => {
    async function initializeContract() {
      if (!builderId) {
        router.push('/buyer/discover');
        return;
      }

      try {
        // 1. Verify Buyer is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
          return;
        }
        setCurrentUser(user);

        // 2. Fetch the Expert's Profile
        const { data: expertData, error } = await supabase
          .from('profiles_public')
          .select('id, full_name, avatar_url, headline, base_price_usd')
          .eq('id', builderId)
          .single();

        if (error || !expertData) throw error;
        
        setExpert(expertData);
        // Pre-fill the minimum escrow amount based on the expert's base price
        setEscrowAmount(expertData.base_price_usd);
        // Auto-select payment type based on budget
        setPaymentType(expertData.base_price_usd >= 200 ? 'milestone_based' : 'single_payment');

      } catch (error) {
        console.error("Error loading expert data:", error);
        alert("Could not load expert profile. Returning to marketplace.");
        router.push('/buyer/discover');
      } finally {
        // THIS is what was missing in your old code! It prevents infinite loading.
        setLoading(false);
      }
    }

    initializeContract();
  }, [builderId, router]);

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', description: '', amount: 0, due_date: '' }]);
  };

  const updateMilestone = (index: number, field: string, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const moveMilestone = (fromIndex: number, toIndex: number) => {
    const updated = [...milestones];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setMilestones(updated);
  };

  const getTotalMilestoneAmount = () => milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const getRemainingAmount = () => (Number(escrowAmount) || 0) - getTotalMilestoneAmount();

  const handleInitiateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !escrowAmount || Number(escrowAmount) <= 0) {
      alert("Please complete all fields and ensure a valid escrow amount.");
      return;
    }

    // Validate milestone-based contracts
    if (paymentType === 'milestone_based') {
      if (milestones.length === 0) {
        alert("Please add at least one milestone for milestone-based payment.");
        return;
      }
      if (Math.abs(getTotalMilestoneAmount() - Number(escrowAmount)) > 0.01) {
        alert(`Milestone amounts must equal total budget. Total: $${getTotalMilestoneAmount()}, Budget: $${escrowAmount}`);
        return;
      }
      // Validate each milestone has a title and amount
      for (const m of milestones) {
        if (!m.title.trim() || !m.amount || m.amount <= 0) {
          alert("Each milestone must have a title and a valid amount.");
          return;
        }
        if (m.due_date && new Date(m.due_date) < new Date(new Date().setHours(0,0,0,0))) {
          alert(`Milestone "${m.title}" has a due date in the past. Due dates must be today or in the future.`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Step 1: Create pending collab record
      const { data: collabData, error: collabError } = await supabase
        .from('collabs')
        .insert({
          buyer_id: currentUser.id,
          builder_id: expert.id,
          title: title.trim(),
          description: description.trim(),
          escrow_amount_usd: Number(escrowAmount),
          payment_type: paymentType,
          status: 'pending_funding'
        })
        .select()
        .single();

      if (collabError) throw collabError;

      const milestoneInserts = paymentType === 'milestone_based'
        ? milestones.map((m, index) => ({
            collab_id: collabData.id,
            title: m.title.trim(),
            description: m.description.trim() || null,
            amount_usd: m.amount,
            due_date: m.due_date || null,
            status: 'draft',
            order_index: index
          }))
        : [{
            collab_id: collabData.id,
            title: 'Project Delivery',
            description: description.trim(),
            amount_usd: Number(escrowAmount),
            due_date: null,
            status: 'draft',
            order_index: 0
          }];

      const { data: createdMilestones, error: milestoneError } = await supabase
        .from('milestones')
        .insert(milestoneInserts)
        .select('id, order_index')
        .order('order_index', { ascending: true });
      if (milestoneError) throw milestoneError;

      const firstMilestone = createdMilestones?.[0];
      if (!firstMilestone) throw new Error('No payable milestone was created.');

      router.push(`/checkout/escrow/${firstMilestone.id}`);

    } catch (error: unknown) {
      console.error("Contract Creation Error:", error);
      alert("Failed to initiate contract: " + (error instanceof Error ? error.message : "Unknown error"));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center font-sans animate-pulse">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparing Contract Details...</p>
      </div>
    );
  }

  if (!expert) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 font-sans animate-in fade-in duration-500">
      
      <div className="mb-10">
        <button onClick={() => router.back()} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-4 inline-flex items-center gap-1 transition-colors">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back to Marketplace
        </button>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Initiate Contract</h1>
        <p className="text-sm font-medium text-slate-500 mt-2">Define your project scope and fund the initial escrow to begin work.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* LEFT COLUMN: Expert Summary */}
        <div className="w-full lg:w-1/3 shrink-0">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-24">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Hiring Expert</p>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full overflow-hidden relative bg-slate-100 shrink-0 shadow-inner flex items-center justify-center">
                {expert.avatar_url ? (
                  <Image src={expert.avatar_url} fill sizes="64px" className="object-cover" alt={expert.full_name} />
                ) : (
                  <span className="text-slate-400 text-lg font-bold">{expert.full_name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <h3 className="text-sm font-black text-slate-900 truncate">{expert.full_name}</h3>
                <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">{expert.headline}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Base Project Rate</span>
                <span className="text-xs font-black text-slate-900">${expert.base_price_usd}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Escrow Protection</span>
                <span className="text-[9px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Funds are held securely in escrow and are only released when you approve the milestone deliverables.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Project Form */}
        <div className="flex-1">
          <form onSubmit={handleInitiateContract} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Project Title <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Enterprise RAG Chatbot Integration" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Project Scope & Requirements <span className="text-red-500">*</span></label>
              <textarea 
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe exactly what you need built, required integrations, and expectations..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-colors resize-none shadow-inner"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Payment Type <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentType('single_payment')}
                  className={`p-4 rounded-xl border-2 transition-all ${paymentType === 'single_payment' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentType === 'single_payment' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                      {paymentType === 'single_payment' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900">Single Payment</p>
                      <p className="text-xs text-slate-500">Fund entire amount upfront</p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('milestone_based')}
                  className={`p-4 rounded-xl border-2 transition-all ${paymentType === 'milestone_based' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentType === 'milestone_based' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                      {paymentType === 'milestone_based' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900">Milestone-Based</p>
                      <p className="text-xs text-slate-500">Pay as you complete phases</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {paymentType === 'milestone_based' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Milestones</label>
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Add Milestone
                  </button>
                </div>

                {milestones.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No milestones added yet</p>
                ) : (
                  <div className="space-y-3">
                    {milestones.map((m, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 relative">
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <input
                            type="text"
                            placeholder="Milestone title *"
                            value={m.title}
                            onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                          />
                          <input
                            type="number"
                            placeholder="Amount (USD) *"
                            value={m.amount || ''}
                            onChange={(e) => updateMilestone(index, 'amount', Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={m.description}
                          onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 mb-3"
                        />
                        <input
                          type="date"
                          value={m.due_date}
                          onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-600">Total Allocated:</span>
                    <span className={`font-black ${Math.abs(getRemainingAmount()) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      ${getTotalMilestoneAmount()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="font-bold text-slate-600">Remaining:</span>
                    <span className={`font-black ${Math.abs(getRemainingAmount()) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      ${getRemainingAmount()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Initial Escrow Funding (USD) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">$</span>
                <input 
                  type="number" 
                  min="5"
                  required
                  value={escrowAmount}
                  onChange={(e) => setEscrowAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-4 text-2xl font-black text-slate-900 outline-none focus:border-blue-500 transition-colors shadow-sm"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-500 mt-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your card will be charged this amount to fund the secure escrow vault.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-colors flex items-center gap-2">
                {submitting ? 'Processing...' : paymentType === 'single_payment' ? 'Fund Escrow & Start' : 'Create Contract & Fund First Milestone'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// Wrap in a Suspense boundary for Next.js 13+ App Router compatibility with useSearchParams
export default function ContractPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center font-sans animate-pulse">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Secure Environment...</p>
        </div>
      }>
        <ContractForm />
      </Suspense>
    </div>
  );
}