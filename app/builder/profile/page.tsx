"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    company_name: '',
    support_email: '',
    is_verified: false
  });

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('company_name, support_email')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setProfile({
            company_name: data.company_name || '',
            support_email: data.support_email || user.email || '',
            is_verified: false // Real logic would check a KYC table
          });
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          company_name: profile.company_name,
          support_email: profile.support_email
        })
        .eq('id', user.id);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-10 animate-pulse text-slate-400 font-bold tracking-widest uppercase text-sm">Loading Identity Engine...</div>;
  }

  return (
    <div className="p-10 max-w-5xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-500">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Tools & Profiles</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage your public builder identity and financial integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
          <h2 className="text-lg font-black text-slate-900">Public Identity</h2>
          
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Company / Studio Name</label>
            <input 
              type="text" 
              value={profile.company_name} 
              onChange={(e) => setProfile({...profile, company_name: e.target.value})}
              placeholder="e.g. Nexus AI"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors" 
            />
          </div>
          
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Support Email</label>
            <input 
              type="email" 
              value={profile.support_email} 
              onChange={(e) => setProfile({...profile, support_email: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors" 
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest mt-2 self-start hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {/* Verification Badge */}
          <div className={`${profile.is_verified ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'} border p-8 rounded-3xl shadow-sm`}>
            <h2 className={`text-sm font-black uppercase tracking-widest mb-2 ${profile.is_verified ? 'text-emerald-900' : 'text-slate-900'}`}>Platform Verification</h2>
            <p className={`text-sm mb-6 ${profile.is_verified ? 'text-emerald-700' : 'text-slate-500'}`}>
              {profile.is_verified ? 'You are a Verified Builder. Buyers see the blue checkmark next to your tools.' : 'Your identity has not been verified yet. Complete KYC to earn the verified badge.'}
            </p>
            <button disabled className={`${profile.is_verified ? 'bg-emerald-600/50 text-white' : 'bg-slate-200 text-slate-500'} px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest cursor-not-allowed`}>
              {profile.is_verified ? 'Identity Verified' : 'Verification Pending'}
            </button>
          </div>

          {/* Stripe Connect */}
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Payout Settings</h2>
            <p className="text-sm text-slate-500 mb-6">Connect your bank account via Stripe to receive 100% of your earnings.</p>
            <button className="bg-[#635BFF] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-[#524be0] transition-colors">Connect with Stripe</button>
          </div>
        </div>
      </div>
    </div>
  );
}