"use client";

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FOUNDER_NAV_ITEMS } from '@/lib/founder/constants';

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  inbox: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4-4h10l4 4M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M3 8h18M8 13h8" />
    </svg>
  ),
  scale: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 7l-3 6a3 3 0 006 0l-3-6zm14 0l-3 6a3 3 0 006 0l-3-6zM5 7h14" />
    </svg>
  ),
  card: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-8.13a4 4 0 110 8 4 4 0 010-8zm6 2a4 4 0 110 8" />
    </svg>
  ),
  shield: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

type SearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type FounderShellProps = {
  actorName: string;
  actorEmail: string;
  children: React.ReactNode;
};

function FounderShellInner({ actorName, actorEmail, children }: FounderShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState(urlQuery);
  const [searchOpen, setSearchOpen] = useState(Boolean(urlQuery));
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    setQuery(urlQuery);
    setSearchOpen(Boolean(urlQuery));
  }, [urlQuery]);

  useEffect(() => {
    if (!urlQuery.trim()) {
      setResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    fetch(`/api/founder/search?q=${encodeURIComponent(urlQuery.trim())}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Search failed');
        if (!cancelled) setResults(payload.results ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResults([]);
          setSearchError(err instanceof Error ? err.message : 'Search failed');
        }
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlQuery]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>();
    for (const result of results) {
      const list = groups.get(result.type) ?? [];
      list.push(result);
      groups.set(result.type, list);
    }
    return groups;
  }, [results]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchOpen(true);
    router.push(`/founder?q=${encodeURIComponent(trimmed)}`);
  };

  const isActive = (href: string) =>
    href === '/founder' ? pathname === '/founder' : pathname.startsWith(href);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-100 flex min-w-0 overflow-x-hidden">
      <aside
        className={`fixed md:sticky top-0 md:top-20 z-40 h-screen md:h-[calc(100vh-80px)] w-72 shrink-0 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Zelance</p>
            <p className="text-sm font-black text-white uppercase tracking-widest">Operations Console</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {FOUNDER_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={isActive(item.href) ? 'text-white' : 'text-slate-500'}>
                {ICONS[item.icon]}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="rounded-xl bg-slate-800/60 px-4 py-3">
            <p className="text-xs font-black text-white truncate">{actorName || 'Founder'}</p>
            <p className="text-[10px] font-bold text-slate-500 truncate">{actorEmail}</p>
          </div>
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Exit to Site
          </Link>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-20 z-20 bg-white border-b border-slate-200 px-4 md:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden min-h-11 min-w-11 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Open navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => urlQuery && setSearchOpen(true)}
                  placeholder="Search users, projects, tickets, disputes, escrows, payments…"
                  className="w-full bg-slate-100 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl pl-11 pr-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-900 outline-none"
                />
              </div>

              {searchOpen && urlQuery && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[420px] overflow-y-auto z-30">
                  {searchLoading && (
                    <p className="px-4 py-3 text-sm text-slate-500">Searching for &ldquo;{urlQuery}&rdquo;…</p>
                  )}
                  {!searchLoading && searchError && (
                    <p className="px-4 py-3 text-sm text-rose-600">{searchError}</p>
                  )}
                  {!searchLoading && !searchError && results.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-500">No results for &ldquo;{urlQuery}&rdquo;.</p>
                  )}
                  {!searchLoading && !searchError && results.length > 0 && (
                    <div className="divide-y divide-slate-100">
                      {[...groupedResults.entries()].map(([type, items]) => (
                        <div key={type}>
                          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
                            {type}
                          </p>
                          {items.map((result) => (
                            <Link
                              key={`${result.type}-${result.id}`}
                              href={result.href}
                              onClick={() => setSearchOpen(false)}
                              className="block px-4 py-2.5 hover:bg-slate-50"
                            >
                              <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                              <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            <span className="hidden lg:inline-flex items-center text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-full">
              Founder Access
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export default function FounderShell(props: FounderShellProps) {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-80px)] bg-slate-100" />}>
      <FounderShellInner {...props} />
    </Suspense>
  );
}
