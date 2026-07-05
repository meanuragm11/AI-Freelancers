"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const BanknotesIcon = () => (
  <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const GlobeAsiaAustraliaIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

export default function GeographicWallet() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [region, setRegion] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);

  useEffect(() => {
    async function loadWallet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: profile }, { data: invoices }] = await Promise.all([
        supabase.from('profiles').select('support_email, payouts_enabled, payment_routing_id, total_earnings_usd').eq('id', user.id).single(),
        supabase.from('invoices').select('net_payout_usd, status').eq('builder_id', user.id).in('status', ['paid', 'processing']),
      ]);

      if (profile?.support_email) setPaypalEmail(profile.support_email);
      if (profile?.payment_routing_id) setRegion('india');
      else if (profile?.support_email) setRegion('international');
      setPayoutsEnabled(Boolean(profile?.payouts_enabled || profile?.payment_routing_id));

      const clearedFromInvoices = (invoices ?? [])
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.net_payout_usd), 0);

      setAvailableBalance(clearedFromInvoices || Number(profile?.total_earnings_usd ?? 0));
      setLoading(false);
    }
    loadWallet();
  }, []);

  const handleRazorpayConnect = async () => {
    setSaving(true);
    alert('Razorpay Route onboarding is not yet configured. Contact support to link your Indian bank account.');
    setSaving(false);
  };

  const handleInternationalSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ support_email: paypalEmail }).eq('id', user.id);
      alert('International payout method saved securely!');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Wallet...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight">Wallet & Payouts</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">Manage your earnings and global withdrawal methods.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <BanknotesIcon />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Available to Withdraw</p>
          <h2 className="text-5xl font-black text-white tracking-tight mb-4">
            ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>

          <p className="text-sm text-slate-400 font-medium mb-6">
            Cleared funds from completed invoices and component sales.
          </p>

          <button
            disabled={availableBalance <= 0 || !payoutsEnabled}
            className="w-full bg-slate-800 text-slate-500 py-3 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed border border-slate-700 disabled:opacity-60"
          >
            {payoutsEnabled ? 'Withdraw Funds' : 'Connect Payout Method First'}
          </button>
        </div>

        <div className="bg-[#0b1120] border border-slate-800 rounded-3xl p-8 flex flex-col shadow-xl">
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <GlobeAsiaAustraliaIcon /> Payout Routing
          </h3>

          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
            Select Tax Residency
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full bg-[#111827] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none appearance-none mb-6"
          >
            <option value="" disabled>Where is your bank located?</option>
            <option value="india">India (Automated)</option>
            <option value="international">Rest of the World (Manual)</option>
          </select>

          {region === 'india' && (
            <div className="mt-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-4">
                <p className="text-xs text-blue-400 font-medium">
                  Indian residents receive automated bank transfers via Razorpay Route once onboarding is complete.
                </p>
              </div>
              <button
                onClick={handleRazorpayConnect}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50"
              >
                {saving ? 'Routing...' : 'Connect Indian Bank'}
              </button>
            </div>
          )}

          {region === 'international' && (
            <div className="mt-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-4">
                <p className="text-xs text-amber-400 font-medium">
                  International payouts are processed via PayPal on the 1st and 15th of every month.
                </p>
              </div>
              <input
                type="email"
                placeholder="Enter your PayPal Email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="w-full bg-[#111827] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none mb-4"
              />
              <button
                onClick={handleInternationalSave}
                disabled={saving || !paypalEmail}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(217,119,6,0.3)] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save International Details'}
              </button>
            </div>
          )}

          {!region && (
            <div className="mt-auto">
              <p className="text-xs text-slate-500 font-medium text-center">
                Please select a region to configure your payout settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
