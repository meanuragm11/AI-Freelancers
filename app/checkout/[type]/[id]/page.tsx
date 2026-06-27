"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SecureCheckout() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // URL Parameters
  const checkoutType = params.type as string; // 'escrow' or 'asset'
  const referenceId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'wallet'>('card');
  
  // Transaction Details
  const [transaction, setTransaction] = useState({
    title: '',
    description: '',
    amount: 0,
    platformFee: 0,
    total: 0,
    recipientName: ''
  });

  useEffect(() => {
    async function initializeCheckout() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/auth'); return; }
      setUser(currentUser);

      try {
        // 1. ESCROW FUNDING LOGIC
        if (checkoutType === 'escrow') {
          const { data: milestone, error } = await supabase
            .from('milestones')
            .select('*, collabs(title, builder:profiles!builder_id(full_name))')
            .eq('id', referenceId)
            .single();

          if (error || !milestone) throw new Error("Invalid Escrow ID");

          const amount = Number(milestone.amount_usd);
          const fee = amount * 0.05; // 5% buyer protection fee

          setTransaction({
            title: `Escrow Funding: ${milestone.title}`,
            description: `Project: ${milestone.collabs.title}`,
            amount: amount,
            platformFee: fee,
            total: amount + fee,
            recipientName: milestone.collabs.builder.full_name
          });
        } 
        // 2. ASSET PURCHASE LOGIC
        else if (checkoutType === 'asset') {
          const { data: component, error } = await supabase
            .from('components')
            .select('*, builder:profiles!builder_id(full_name)')
            .eq('id', referenceId)
            .single();

          if (error || !component) throw new Error("Invalid Asset ID");

          const amount = Number(component.price_usd);
          
          setTransaction({
            title: `Asset License: ${component.title}`,
            description: `Category: ${component.category}`,
            amount: amount,
            platformFee: 0, // No extra buyer fee for assets
            total: amount,
            recipientName: component.builder.full_name
          });
        } else {
          throw new Error("Unknown Checkout Type");
        }
      } catch (err: any) {
        alert(err.message);
        router.back();
      } finally {
        setLoading(false);
      }
    }

    initializeCheckout();
  }, [checkoutType, referenceId, router]);

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    // TODO: In production, insert Razorpay/Stripe SDK hook here.
    // For now, we simulate a successful API callback after 2 seconds.

    setTimeout(async () => {
      try {
        if (checkoutType === 'escrow') {
          // Update milestone status to 'funded'
          await supabase.from('milestones').update({ status: 'funded' }).eq('id', referenceId);
          alert("Escrow funded successfully! Funds are secured in the vault.");
          router.back(); 
        } 
        else if (checkoutType === 'asset') {
          // Add to buyer's library
          await supabase.from('library').insert({
            user_id: user.id,
            component_id: referenceId
          });
          
          // Increment creator's sales count
          await supabase.rpc('increment_component_sales', { comp_id: referenceId });

          alert("Asset purchased successfully! Added to your Secure Vault.");
          router.push('/buyer/library');
        }
      } catch (err: any) {
        alert("Transaction failed: " + err.message);
        setProcessing(false);
      }
    }, 2000);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase tracking-widest text-xs text-slate-400 animate-pulse">Initializing Secure Gateway...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="#" onClick={() => router.back()} className="text-2xl font-black tracking-tighter text-slate-900">
          Zelance<span className="text-blue-600">.</span>
        </Link>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          256-Bit SSL Secured
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        
        {/* LEFT COLUMN: Order Summary */}
        <div className="animate-in fade-in slide-in-from-left-8 duration-500">
          <button onClick={() => router.back()} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-6 inline-flex items-center gap-1 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Cancel & Return
          </button>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Complete Payment</h1>
          <p className="text-sm font-medium text-slate-500 mb-8">Review your transaction details before authorizing the charge.</p>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Order Summary</h3>
            
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg font-black text-slate-900 leading-tight">{transaction.title}</h4>
                <p className="text-xs font-medium text-slate-500 mt-1">{transaction.description}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-3">Recipient: {transaction.recipientName}</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                <span>Subtotal</span>
                <span>${transaction.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                <span>Zelance Protection Fee (5%)</span>
                <span>${transaction.platformFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
              <span className="text-base font-black text-slate-900">Total Due</span>
              <span className="text-3xl font-black text-slate-900">${transaction.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-3 text-right">Amounts displayed in USD</p>
          </div>
          
          {checkoutType === 'escrow' && (
             <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
               <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
               </div>
               <div>
                 <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Escrow Protection Active</h4>
                 <p className="text-xs font-medium text-blue-800 leading-relaxed">Your funds are held securely by Zelance. They will only be released to the expert once you review and approve the final milestone deliverables.</p>
               </div>
             </div>
          )}
        </div>

        {/* RIGHT COLUMN: Payment Details */}
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 delay-150">
          <form onSubmit={handleSimulatePayment} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
            <h3 className="text-lg font-black text-slate-900 mb-6">Payment Method</h3>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <button type="button" onClick={() => setPaymentMethod('card')} className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Card</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod('upi')} className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'upi' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">UPI / Net</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod('wallet')} className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'wallet' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Wallet</span>
              </button>
            </div>

            {/* Simulated Card Form */}
            {paymentMethod === 'card' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Cardholder Name</label>
                  <input type="text" required placeholder="Name on card" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Card Number</label>
                  <div className="relative">
                    <input type="text" required placeholder="0000 0000 0000 0000" maxLength={19} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors shadow-inner tracking-widest" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                      <div className="w-8 h-5 bg-slate-200 rounded-sm"></div>
                      <div className="w-8 h-5 bg-slate-200 rounded-sm"></div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Expiry Date</label>
                    <input type="text" required placeholder="MM/YY" maxLength={5} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors shadow-inner text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">CVC</label>
                    <input type="text" required placeholder="123" maxLength={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors shadow-inner text-center" />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod !== 'card' && (
              <div className="py-10 text-center bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Integration Pending</p>
                <p className="text-sm font-medium text-slate-400 mt-2">Razorpay UPI & Wallet UI will render here.</p>
              </div>
            )}

            <button type="submit" disabled={processing} className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-400 text-white mt-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-xl flex items-center justify-center gap-2 group">
              {processing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing Payment...
                </>
              ) : (
                <>
                  Pay ${transaction.total.toLocaleString(undefined, {minimumFractionDigits: 2})} Securely
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4 text-center">
              Powered by Stripe & Razorpay
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}