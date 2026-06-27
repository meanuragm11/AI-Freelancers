"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';

type SettingsTab = 'profile' | 'billing' | 'security' | 'notifications';

export default function BuyerSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({ full_name: '', location: '', bio: '' });

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setCurrentUser(user);

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
      
      setLoading(false);
    }
    loadSettings();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      location: profile.location,
      bio: profile.bio
    }).eq('id', currentUser.id);

    if (error) alert("Failed to update profile.");
    else alert("Profile updated successfully!");
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase tracking-widest text-xs text-slate-400 animate-pulse">Loading Configuration...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link href="/buyer/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage your enterprise profile, billing methods, and security preferences.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex flex-col md:flex-row gap-8 lg:gap-12 animate-in fade-in duration-500">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-24">
            <button onClick={() => setActiveTab('profile')} className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              Profile Identity
            </button>
            <button onClick={() => setActiveTab('billing')} className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'billing' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              Billing & Tax
            </button>
            <button onClick={() => setActiveTab('security')} className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'security' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              Security & Auth
            </button>
            <button onClick={() => setActiveTab('notifications')} className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'notifications' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              Notifications
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-6">General Information</h2>
                
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 relative border border-slate-200 shadow-sm">
                    <Image src={profile.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200'} fill sizes="80px" className="object-cover" alt="Profile" />
                  </div>
                  <div>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm mb-2 block">
                      Change Avatar
                    </button>
                    <p className="text-[10px] font-bold text-slate-400">JPG, GIF or PNG. Max size 2MB.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                      <input type="text" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Location / Timezone</label>
                      <input type="text" value={profile.location || ''} onChange={e => setProfile({...profile, location: e.target.value})} placeholder="e.g., San Francisco, CA" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Company Bio / Description</label>
                    <textarea rows={4} value={profile.bio || ''} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-colors resize-none" />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={saving} className="bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* BILLING & TAX */}
          {activeTab === 'billing' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-8 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full blur-2xl"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <span className="bg-blue-500 text-white px-2.5 py-1 rounded uppercase tracking-widest text-[9px] font-black mb-3 inline-block">Active Plan</span>
                    <h2 className="text-2xl font-black mb-1">Zelance Enterprise</h2>
                    <p className="text-sm font-medium text-slate-300">Escrow protection, priority support, and infinite asset vault limits.</p>
                  </div>
                  <p className="text-3xl font-black">$0 <span className="text-sm text-slate-400">/mo</span></p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-black text-slate-900">Payment Methods</h2>
                  <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800">+ Add Card</button>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-slate-200 rounded flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Visa ending in 4242</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expires 12/28 • Default</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900">Edit</button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-6">Billing History</h2>
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No past invoices found.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY & AUTH */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-6">Security & Authentication</h2>
                
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900">Email Address</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{currentUser?.email}</p>
                    </div>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors w-max">Change Email</button>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900">Password</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last changed: Never</p>
                    </div>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors w-max">Update Password</button>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-black text-slate-900 flex items-center gap-2">Two-Factor Authentication <span className="bg-green-100 text-green-700 text-[8px] px-2 py-0.5 rounded uppercase tracking-widest">Recommended</span></p>
                      <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm">Add an extra layer of security to your account by requiring a code from an authenticator app.</p>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm w-max">Enable 2FA</button>
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-rose-900 mb-2">Danger Zone</h2>
                <p className="text-xs font-medium text-rose-700 mb-6">Permanently delete your account, active projects, and purchased asset licenses. This action cannot be undone.</p>
                <button className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900">Direct Messages</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Receive an email when a freelancer messages you.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900">Milestone & Escrow Alerts</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Critical alerts for funded, completed, or disputed milestones.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-slate-900">Product Updates & Marketing</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Receive news about new features and top AI experts.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}