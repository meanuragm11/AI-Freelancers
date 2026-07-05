"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { fetchArenaBuilders, type ArenaBuilder } from '@/lib/arena/rankBuilders';

type ArenaLeaderboardViewProps = {
  backHref?: string;
  backLabel?: string;
};

export default function ArenaLeaderboardView({
  backHref = '/',
  backLabel = 'Back to Home',
}: ArenaLeaderboardViewProps) {
  const [builders, setBuilders] = useState<ArenaBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const ranked = await fetchArenaBuilders(supabase);
        setBuilders(ranked);
      } catch (loadError) {
        console.error('Failed to load arena leaderboard:', loadError);
        setError('Unable to load arena rankings.');
      } finally {
        setLoading(false);
      }
    }

    void loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Compiling Mesh Ranks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-black text-slate-900 mb-3">The Arena</h1>
        <p className="text-sm text-slate-500 font-medium max-w-md">{error}</p>
      </div>
    );
  }

  if (builders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-black text-slate-900 mb-3">The Arena</h1>
        <p className="text-sm text-slate-500 font-medium max-w-md">No ranked builders yet. Publish AI components to appear on the leaderboard.</p>
      </div>
    );
  }

  const topThree = builders.slice(0, 3);
  const theRest = builders.slice(3);

  const renderFallbackAvatar = (name: string, sizeClass = 'w-12 h-12 text-lg') => (
    <div className={`rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center ${sizeClass}`}>
      <span className="font-black text-slate-400 uppercase">{name?.charAt(0) || 'E'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-slate-900 pt-20 pb-48 px-6 text-center relative overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-[10%] right-[20%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <Link href={backHref} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white mb-6 transition-colors">
            ← {backLabel}
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Live Global Rankings
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">The Arena</h1>
          <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-2xl mx-auto">
            Be in the spotlight of thousands of buyers by publishing high-quality AI Assets and become one of Zelance's top AI creators.
          </p>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 -mt-28 relative z-20">
        {topThree.length === 3 && (
          <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-6 md:gap-8 mb-20 px-2">
            <div className="order-2 md:order-1 w-full md:w-1/3 max-w-[280px] bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_10px_40px_-15px_rgba(148,163,184,0.3)] flex flex-col items-center text-center transform md:-translate-y-4 hover:-translate-y-6 transition-all duration-300 group">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-400 text-white rounded-full flex items-center justify-center text-sm font-black mb-5 shadow-inner border border-slate-200">#2</div>
              <Link href={`/profile/${topThree[1].id}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                <div className="w-20 h-20 rounded-full mb-4 relative p-1 bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm">
                  {topThree[1].avatar_url ? (
                    <img src={topThree[1].avatar_url} alt="Rank 2" className="w-full h-full object-cover rounded-full border-2 border-white" />
                  ) : (
                    renderFallbackAvatar(topThree[1].full_name, 'w-full h-full text-xl bg-white')
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{topThree[1].full_name}</h3>
              </Link>
              <p className="text-xs font-bold text-slate-500 mb-6">{topThree[1].headline}</p>
              <div className="w-full border-t border-slate-100 pt-5 mt-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Published</p>
                <p className="text-3xl font-black text-slate-700">{topThree[1].components_count}</p>
              </div>
            </div>

            <div className="order-1 md:order-2 w-full md:w-1/3 max-w-[320px] bg-white border-2 border-amber-300 rounded-3xl p-8 shadow-[0_15px_50px_-10px_rgba(245,158,11,0.25)] flex flex-col items-center text-center relative z-10 transform md:-translate-y-12 hover:-translate-y-14 transition-all duration-300 group">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border-2 border-white whitespace-nowrap">
                👑 Grandmaster
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-amber-500 text-white rounded-full flex items-center justify-center text-lg font-black mb-5 mt-2 shadow-inner border border-amber-200">#1</div>
              <Link href={`/profile/${topThree[0].id}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                <div className="w-28 h-28 rounded-full mb-5 relative p-1 bg-gradient-to-br from-amber-300 to-amber-500 shadow-md">
                  {topThree[0].avatar_url ? (
                    <img src={topThree[0].avatar_url} alt="Rank 1" className="w-full h-full object-cover rounded-full border-4 border-white" />
                  ) : (
                    renderFallbackAvatar(topThree[0].full_name, 'w-full h-full text-3xl bg-white')
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">{topThree[0].full_name}</h3>
              </Link>
              <p className="text-xs font-bold text-amber-600 mb-8">{topThree[0].headline}</p>
              <div className="w-full bg-amber-50/50 border border-amber-100/50 rounded-2xl py-5 mt-auto">
                <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest mb-1">Published</p>
                <p className="text-4xl font-black text-amber-500">{topThree[0].components_count}</p>
              </div>
            </div>

            <div className="order-3 md:order-3 w-full md:w-1/3 max-w-[280px] bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_10px_40px_-15px_rgba(249,115,22,0.15)] flex flex-col items-center text-center transform md:translate-y-0 hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-300 to-orange-400 text-white rounded-full flex items-center justify-center text-sm font-black mb-5 shadow-inner border border-orange-200">#3</div>
              <Link href={`/profile/${topThree[2].id}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                <div className="w-20 h-20 rounded-full mb-4 relative p-1 bg-gradient-to-br from-orange-200 to-orange-300 shadow-sm">
                  {topThree[2].avatar_url ? (
                    <img src={topThree[2].avatar_url} alt="Rank 3" className="w-full h-full object-cover rounded-full border-2 border-white" />
                  ) : (
                    renderFallbackAvatar(topThree[2].full_name, 'w-full h-full text-xl bg-white')
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-orange-600 transition-colors">{topThree[2].full_name}</h3>
              </Link>
              <p className="text-xs font-bold text-slate-500 mb-6">{topThree[2].headline}</p>
              <div className="w-full border-t border-slate-100 pt-5 mt-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Published</p>
                <p className="text-3xl font-black text-slate-700">{topThree[2].components_count}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl shadow-lg shadow-slate-200/40 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Global Contender List</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {theRest.length > 0 ? `Ranks 4 - ${builders.length}` : `Top ${builders.length}`}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {(theRest.length > 0 ? theRest : builders).map((builder) => (
              <div key={builder.id} className="p-6 sm:px-8 flex items-center gap-5 md:gap-8 hover:bg-slate-50/80 transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors flex-shrink-0">
                  #{builder.rank}
                </div>
                <Link href={`/profile/${builder.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity flex-1 min-w-0">
                  <div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden shadow-sm border border-slate-200">
                    {builder.avatar_url ? (
                      <img src={builder.avatar_url} alt={builder.full_name} className="w-full h-full object-cover" />
                    ) : (
                      renderFallbackAvatar(builder.full_name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-base font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">{builder.full_name}</h4>
                    </div>
                    <p className="text-xs font-medium text-slate-500 truncate">{builder.headline}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-8">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Published</p>
                    <p className="text-xl font-black text-slate-900">{builder.components_count}</p>
                  </div>
                  <Link href={`/profile/${builder.id}`} className="bg-white border border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm whitespace-nowrap">
                    Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
