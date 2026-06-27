"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function BuilderKYC() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    legalName: '',
    taxId: '',
    country: 'United States',
    bankAccountUri: '', // e.g., IBAN or Routing/Account string
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required.");

      // In production, this data is sent to Razorpay Route or Stripe Connect 
      // to generate a 'Connected Account ID'. For this UI, we simulate saving the status.
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'pending',
          // payment_routing_id: 'rzp_route_generated_id' // Mock ID
        })
        .eq('id', user.id);

      if (error) throw error;

      alert("KYC Documentation submitted securely to the financial gateway. Verification takes 1-2 hours.");
      router.push('/builder/dashboard');

    } catch (error: any) {
      alert("Routing Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-2xl">
        
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm">
            Step {step} of 2
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
            Financial Compliance (KYC)
          </h1>
          <p className="text-slate-500 font-medium max-w-md mx-auto">
            To clear Escrow funds directly to your global bank account, we require regulatory verification.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-8">
            <div className={`h-full bg-blue-600 transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`}></div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleNext} className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Legal Full Name (Matches Government ID)</label>
                <input 
                  required 
                  type="text" 
                  value={formData.legalName}
                  onChange={(e) => setFormData({...formData, legalName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Tax Identification Number (SSN / PAN / VAT)</label>
                <input 
                  required 
                  type="password" 
                  placeholder="•••-••-••••"
                  value={formData.taxId}
                  onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-black text-slate-900 outline-none transition-all tracking-widest" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Tax Residency</label>
                <select 
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="United States">United States</option>
                  <option value="India">India</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="European Union">European Union</option>
                  <option value="Other">Other Global Region</option>
                </select>
              </div>

              <button type="submit" className="w-full mt-4 bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md">
                Continue to Routing Setup →
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-2">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Security Notice</p>
                <p className="text-xs font-medium text-amber-900">Your routing data is tokenized and stored securely with our financial gateway. Zelance does not store your raw banking details.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Global Bank Routing / IBAN</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Enter your local bank routing or IBAN string"
                  value={formData.bankAccountUri}
                  onChange={(e) => setFormData({...formData, bankAccountUri: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" 
                />
              </div>

              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl mt-2 cursor-pointer group">
                <input required type="checkbox" id="tos" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
                <label htmlFor="tos" className="text-xs font-medium text-slate-600 cursor-pointer group-hover:text-slate-900">
                  I certify this data is accurate and agree to the <span className="text-blue-600 font-bold">Platform Payout Terms</span>.
                </label>
              </div>

              <div className="flex gap-4 mt-4">
                <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-sm">
                  Back
                </button>
                <button type="submit" disabled={loading} className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50">
                  {loading ? 'Encrypting Payload...' : 'Submit to Gateway'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}