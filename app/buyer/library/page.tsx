"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LibraryAssetCard, { type LibraryAssetCardData } from "@/components/buyer/library/LibraryAssetCard";
import LibraryEmptyState from "@/components/buyer/library/LibraryEmptyState";
import LibrarySkeletonGrid from "@/components/buyer/library/LibrarySkeletonGrid";
import SecurePayloadModal from "@/components/buyer/library/SecurePayloadModal";
import { useAssetDownload } from "@/components/buyer/library/useAssetDownload";

export default function AssetLibraryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<LibraryAssetCardData[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { downloadAsset, error, clearError, securePayload, closeSecurePayload, isDownloading } =
    useAssetDownload();

  useEffect(() => {
    async function fetchLibrary() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      await fetch("/api/buyer/library/sync", { method: "POST" }).catch(() => null);

      const response = await fetch("/api/buyer/library");
      const result = await response.json();
      if (response.ok) setAssets(result.assets || []);
      setLoading(false);
    }

    fetchLibrary();
  }, [router]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(assets.map((a) => a.components?.category).filter((category): category is string => Boolean(category)))
      ),
    ],
    [assets]
  );

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesCategory =
        activeCategory === "All" || asset.components?.category === activeCategory;
      const matchesSearch =
        !query ||
        asset.components?.title?.toLowerCase().includes(query) ||
        asset.builder?.full_name?.toLowerCase().includes(query) ||
        asset.asset_type.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [assets, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans md:p-10">
      <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/buyer/dashboard"
              className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">My AI Solutions</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Your purchased library — open, preview, and download anytime.
            </p>
          </div>

          <Link
            href="/buyer/discover"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-blue-600"
          >
            Discover AI Solutions
          </Link>
        </div>

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
            <p className="text-xs font-bold text-rose-700">{error}</p>
            <button type="button" onClick={clearError} className="text-rose-400 hover:text-rose-700">
              ✕
            </button>
          </div>
        )}

        {!loading && assets.length > 0 && (
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                    activeCategory === cat
                      ? "bg-blue-600 text-white shadow-md"
                      : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:max-w-xs">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your library..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none ring-blue-500 transition-shadow focus:ring-2"
              />
            </div>
          </div>
        )}

        {loading ? (
          <LibrarySkeletonGrid />
        ) : assets.length === 0 ? (
          <LibraryEmptyState />
        ) : filteredAssets.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h3 className="text-lg font-black text-slate-900">No matches in this filter</h3>
            <p className="mt-2 text-sm text-slate-500">Try another category or clear your search.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("All");
                setSearchQuery("");
              }}
              className="mt-6 rounded-xl bg-slate-100 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {filteredAssets.length} solution{filteredAssets.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssets.map((asset) => (
                <LibraryAssetCard
                  key={asset.id}
                  asset={asset}
                  onDownload={(componentId) => downloadAsset(componentId)}
                  downloading={isDownloading(asset.components.id)}
                />
              ))}
            </div>
          </>
        )}

        {securePayload && (
          <SecurePayloadModal
            title={securePayload.title}
            payload={securePayload.payload}
            onClose={closeSecurePayload}
          />
        )}
      </div>
    </div>
  );
}
