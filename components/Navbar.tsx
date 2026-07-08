"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { subscribeToOnlinePresence } from '@/lib/onlinePresenceChannel';
import NotificationBell from "@/components/NotificationBell";
import { isVerifiedBuilder, showsBuyerNav } from "@/lib/accountMode";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [hasPurchases, setHasPurchases] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role, is_freelancer')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    }
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setCurrentUser(session.user);
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => { if (data) setProfile(data) });
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setProfile(null);
      }
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      setHasPurchases(false);
      return;
    }

    let cancelled = false;

    fetch('/api/buyer/has-purchases')
      .then((res) => (res.ok ? res.json() : { hasPurchases: false }))
      .then((data) => {
        if (!cancelled) setHasPurchases(Boolean(data.hasPurchases));
      })
      .catch(() => {
        if (!cancelled) setHasPurchases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // Track online presence app-wide so chat can show real status
  useEffect(() => {
    if (!currentUser?.id) return;
    return subscribeToOnlinePresence(currentUser.id, () => {});
  }, [currentUser?.id]);

  // Accessibility: Close dropdowns on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const isBuilderAccount = isVerifiedBuilder(profile);
  const isBuyerAccount = showsBuyerNav(profile);

  return (
    <nav className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">

        <Link href="/" aria-label="Zelance Homepage" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-black tracking-tighter text-slate-900">
            Zelance<span className="text-blue-600">.</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center justify-center flex-1 gap-10">
          <Link href="/" className="text-[11px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors">
            Home
          </Link>
          {(!currentUser || isBuyerAccount) && (
            <Link href="/buyer/discover" className="text-[11px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors">
              Hire AI Expert
            </Link>
          )}
          {currentUser && hasPurchases && (
            <Link href="/buyer/dashboard" className="text-[11px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors">
              Manage Purchases
            </Link>
          )}
          <Link href="/builder/dashboard" className="text-[11px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors">
            {isBuilderAccount ? 'Builder Workspace' : 'Become AI Expert'}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {!currentUser ? (
            <>
              <div className="hidden md:flex items-center gap-4">
                <Link href="/auth" className="text-[11px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors px-2">
                  Log In
                </Link>
                <Link href="/auth" className="bg-[#111827] hover:bg-black text-white px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5">
                  Sign Up
                </Link>
              </div>
              <button
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle Mobile Menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-slate-900 p-2"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 md:gap-3">
              <NotificationBell userId={currentUser.id} />

              <div className="hidden md:block relative" ref={dropdownRef}>
                <button
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label="User Menu"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-2 p-1 rounded-full transition-all duration-200 border-2 ${dropdownOpen ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-slate-200'}`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 relative flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        fill sizes="40px" className="object-cover" alt="Profile Avatar" priority
                      />
                    ) : (
                      <span className="text-slate-400 text-sm font-bold">{profile?.full_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                </button>

                {dropdownOpen && (
                  <div role="menu" className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                    <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative bg-slate-100 flex items-center justify-center">
                        {profile?.avatar_url ? (
                          <Image src={profile.avatar_url} fill sizes="40px" className="object-cover" alt="Profile" />
                        ) : (
                          <span className="text-slate-400 text-sm font-bold">{profile?.full_name?.charAt(0) || '?'}</span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-black text-slate-900 truncate">{profile?.full_name || 'Loading...'}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${profile?.is_freelancer ? 'text-blue-600' : 'text-slate-400'}`}>
                          {profile?.is_freelancer ? 'Verified Expert' : 'Client Account'}
                        </p>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      <Link href="/profile/me" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        My Profile
                      </Link>

                      <Link href="/builder/dashboard" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {isBuilderAccount ? 'Workspace' : 'Become AI Expert'}
                      </Link>

                      <Link href="/buyer/dashboard" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        Manage Purchases
                      </Link>

                      <Link href="/buyer/saved" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        Saved Experts
                      </Link>

                      <Link href={isBuilderAccount ? '/builder/wallet' : '/buyer/billing'} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        Payments
                      </Link>

                      <Link href="/support" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Support
                      </Link>

                      <Link href={isBuilderAccount ? '/builder/settings' : '/buyer/settings'} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Settings
                      </Link>

                      <div className="h-px bg-slate-100 my-2"></div>

                      <button role="menuitem" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors group">
                        <svg className="w-4 h-4 text-rose-400 group-hover:text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle Mobile Menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-slate-900 p-2"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 absolute w-full h-[calc(100vh-80px)] overflow-y-auto z-40 pb-20 shadow-xl">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <Link href="/" className="block text-lg font-black text-slate-900">Home</Link>
              {(!currentUser || isBuyerAccount) && <Link href="/buyer/discover" className="block text-lg font-black text-slate-900">Hire AI Experts</Link>}
              {currentUser && hasPurchases && <Link href="/buyer/dashboard" className="block text-lg font-black text-slate-900">Manage Purchases</Link>}
              <Link href="/builder/dashboard" className="block text-lg font-black text-slate-900">{isBuilderAccount ? 'Builder Workspace' : 'Become AI Expert'}</Link>
            </div>
            <div className="h-px bg-slate-200"></div>

            {!currentUser ? (
              <div className="flex flex-col gap-3">
                <Link href="/auth" className="bg-slate-100 text-slate-900 px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest text-center">Log In</Link>
                <Link href="/auth" className="bg-[#111827] text-white px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest text-center shadow-md">Sign Up</Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-full overflow-hidden relative border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <Image src={profile.avatar_url} fill sizes="48px" className="object-cover" alt="Profile" />
                    ) : (
                      <span className="text-slate-400 text-sm font-bold">{profile?.full_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-slate-900 truncate">{profile?.full_name || 'Loading...'}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{profile?.is_freelancer ? 'Expert' : 'Buyer'}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Link href="/profile/me" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">👤 My Profile</Link>
                  <Link href="/builder/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                    {isBuilderAccount ? '💼 Workspace' : '✨ Become AI Expert'}
                  </Link>
                  <Link href="/buyer/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">📁 Manage Purchases</Link>
                  <Link href="/buyer/saved" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">🔖 Saved Experts</Link>
                  <Link href={isBuilderAccount ? '/builder/wallet' : '/buyer/billing'} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">💳 Payments</Link>
                  <Link href="/support" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">🎫 Support</Link>
                  <Link href={isBuilderAccount ? '/builder/settings' : '/buyer/settings'} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">⚙️ Settings</Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">🚪 Log Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}