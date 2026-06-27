"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, is_freelancer')
          .eq('id', session.user.id)
          .single();
        if (data) setProfile(data);
      }
    }
    fetchUser();

    // Listen for Auth changes (e.g., login/logout across tabs)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setCurrentUser(session.user);
        // Refresh profile on sign in
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({data}) => { if(data) setProfile(data) });
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setProfile(null);
      }
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter text-slate-900">
            Zelance<span className="text-blue-600">.</span>
          </span>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/buyer/discover" className="text-sm font-black text-slate-600 hover:text-blue-600 uppercase tracking-widest transition-colors">
            Hire AI Experts
          </Link>
          <Link href="/buyer/discover?tab=components" className="text-sm font-black text-slate-600 hover:text-blue-600 uppercase tracking-widest transition-colors">
            AI Assets
          </Link>
          
          {/* Conditional "Become AI Expert" link in main nav if they aren't one yet */}
          {currentUser && profile && !profile.is_freelancer && (
            <Link href="/builder/dashboard" className="text-sm font-black text-slate-600 hover:text-blue-600 uppercase tracking-widest transition-colors">
              Become AI Expert
            </Link>
          )}
        </div>

        {/* AUTH ACTIONS OR AVATAR DROPDOWN */}
        <div className="hidden md:flex items-center gap-4">
          {!currentUser ? (
            <>
              <Link href="/auth" className="text-sm font-black text-slate-600 hover:text-slate-900 uppercase tracking-widest transition-colors px-4">
                Log In
              </Link>
              <Link href="/auth" className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-colors shadow-sm">
                Sign Up
              </Link>
            </>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-full transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 relative border border-slate-200">
                  <Image 
                    src={profile?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100'} 
                    fill sizes="40px" className="object-cover" alt="Profile" 
                  />
                </div>
              </button>

              {/* DROPDOWN MENU */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                  
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <p className="text-sm font-black text-slate-900 truncate">{profile?.full_name || 'Loading...'}</p>
                    <Link href="/profile/me" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800">
                      View Public Profile
                    </Link>
                  </div>

                  <div className="py-2">
                    {/* BUYER SECTION */}
                    <div className="px-4 py-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Buying</p>
                      <Link href="/buyer/dashboard" className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                        My Dashboard
                      </Link>
                      {/* Replaced 'My Projects' with 'My AI Assets' */}
                      <Link href="/buyer/projects" className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                        My AI Assets
                      </Link>
                      <Link href="/buyer/messages" className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                        Messages
                      </Link>
                    </div>

                    <div className="h-px bg-slate-100 my-1"></div>

                    {/* FREELANCER SECTION */}
                    <div className="px-4 py-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Selling</p>
                      {profile?.is_freelancer ? (
                        <>
                          <Link href="/builder/dashboard" className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                            Expert Workspace
                          </Link>
                          <Link href="/builder/dashboard" className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                            Asset Inventory
                          </Link>
                          <Link href="/builder/dashboard" className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                            Earnings & Payouts
                          </Link>
                        </>
                      ) : (
                        <Link href="/builder/dashboard" className="block px-3 py-2 text-[10px] font-black text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors uppercase tracking-widest text-center">
                          Become AI Expert
                        </Link>
                      )}
                    </div>

                    <div className="h-px bg-slate-100 my-1"></div>

                    {/* GLOBAL SECTION */}
                    <div className="px-4 py-2">
                      <Link href="/buyer/settings" className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                        Settings & Billing
                      </Link>
                      <Link href="/support" className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                        Help Center
                      </Link>
                    </div>

                    <div className="h-px bg-slate-100 my-1"></div>

                    <div className="px-4 py-2">
                      <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        Log Out
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-900 p-2">
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>

      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 absolute w-full h-[calc(100vh-80px)] overflow-y-auto z-40 pb-20">
          <div className="p-6 space-y-6">
            
            <div className="space-y-4">
              <Link href="/buyer/discover" className="block text-lg font-black text-slate-900">Hire AI Experts</Link>
              <Link href="/buyer/discover?tab=components" className="block text-lg font-black text-slate-900">AI Assets</Link>
            </div>

            <div className="h-px bg-slate-200"></div>

            {!currentUser ? (
              <div className="flex flex-col gap-3">
                <Link href="/auth" className="bg-slate-100 text-slate-900 px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest text-center">Log In</Link>
                <Link href="/auth" className="bg-blue-600 text-white px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest text-center">Sign Up</Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 relative">
                    <Image src={profile?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100'} fill sizes="48px" className="object-cover" alt="Profile" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{profile?.full_name || 'Loading...'}</p>
                    <Link href="/profile/me" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">View Profile</Link>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buying</p>
                  <Link href="/buyer/dashboard" className="block text-sm font-bold text-slate-700">My Dashboard</Link>
                  {/* Replaced 'My Projects' with 'My AI Assets' */}
                  <Link href="/buyer/projects" className="block text-sm font-bold text-slate-700">My AI Assets</Link>
                  <Link href="/buyer/messages" className="block text-sm font-bold text-slate-700">Messages</Link>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selling</p>
                  {profile?.is_freelancer ? (
                    <>
                      <Link href="/builder/dashboard" className="block text-sm font-bold text-slate-700">Expert Workspace</Link>
                      <Link href="/builder/dashboard" className="block text-sm font-bold text-slate-700">Earnings</Link>
                    </>
                  ) : (
                    <Link href="/builder/dashboard" className="block w-full py-3 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-xl uppercase tracking-widest text-center">Become AI Expert</Link>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</p>
                  <Link href="/buyer/settings" className="block text-sm font-bold text-slate-700">Settings</Link>
                  <button onClick={handleLogout} className="block w-full text-left text-sm font-bold text-red-600">Log Out</button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}