"use client";

import React, { useEffect, useState, use } from "react";
import Image from "@/components/RemoteImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AssetFileBrowser, { type AssetFileItem } from "@/components/buyer/library/AssetFileBrowser";
import CustomProjectModal from "@/components/CustomProjectModal";
import { formatBuilderName } from "@/lib/display/formatBuilderName";

type LibraryAssetDetail = {
  id: string;
  purchased_at: string;
  source: string;
  component_id: string | null;
  service_id: string | null;
  version: string;
  asset_type: string;
  has_download: boolean;
  files: AssetFileItem[];
  component: {
    id: string;
    title: string | null;
    description: string | null;
    category: string | null;
    thumbnail_url: string | null;
    builder_id: string | null;
    published_at: string | null;
  };
  guides: {
    installation: string | null;
    usage: string | null;
    documentation: string | null;
  };
  changelog: Array<{ version: string; date: string | null; notes: string }>;
  included_resources: Array<{ name: string; description?: string; url?: string }>;
  builder: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    headline: string | null;
    average_rating: number | null;
    review_count: number | null;
  } | null;
  builder_reviews: Array<{
    id: string;
    rating: number;
    review: string | null;
    created_at: string;
  }>;
  existing_conversation_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function GuideSection({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-widest text-slate-900">
        {title}
      </h2>
      <div className="prose prose-slate max-w-none text-sm font-medium leading-relaxed text-slate-600 whitespace-pre-wrap">
        {content}
      </div>
    </section>
  );
}

export default function LibraryAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<LibraryAssetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    async function loadAsset() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const response = await fetch(`/api/buyer/library/${id}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to load library item");
        setLoading(false);
        return;
      }

      setAsset(result.asset);
      setLoading(false);
    }

    loadAsset();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading library item...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
        <h2 className="text-2xl font-black text-slate-900">Item unavailable</h2>
        <p className="mt-2 max-w-md text-center text-sm text-slate-500">
          {error || "This item is not in your library."}
        </p>
        <Link
          href="/buyer/library"
          className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  const builderName = formatBuilderName(asset.builder?.full_name || "Verified Creator");
  const reportSubject = encodeURIComponent(`Issue with purchased AI Solution: ${asset.component.title}`);
  const reportMessage = encodeURIComponent(
    `Library entry: ${asset.id}\nSolution ID: ${asset.component.id}\nPurchased: ${asset.purchased_at}`
  );
  const reportHref = `/support?category=${encodeURIComponent("Technical Bug")}&subject=${reportSubject}&message=${reportMessage}`;

  const contactHref = asset.existing_conversation_id
    ? `/buyer/messages?conversation=${asset.existing_conversation_id}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-sans md:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <Link
          href="/buyer/library"
          className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-900"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Library
        </Link>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/9] bg-slate-100">
                {asset.component.thumbnail_url ? (
                  <Image
                    src={asset.component.thumbnail_url}
                    fill
                    className="object-cover"
                    alt={asset.component.title || "Solution preview"}
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-sm font-bold text-slate-400">No preview image</span>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
                    {asset.component.category}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {asset.asset_type}
                  </span>
                  <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                    v{asset.version}
                  </span>
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                  {asset.component.title}
                </h1>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Purchased {formatDate(asset.purchased_at)}
                  {asset.component.published_at ? ` · Published ${formatDate(asset.component.published_at)}` : ""}
                </p>

                <div className="mt-8">
                  <h2 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-widest text-slate-900">
                    Description
                  </h2>
                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600">
                    {asset.component.description}
                  </p>
                </div>
              </div>
            </div>

            <section id="files" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-6 border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-widest text-slate-900">
                Files & Downloads
              </h2>
              <AssetFileBrowser
                itemId={asset.service_id ?? asset.component.id}
                itemType={asset.service_id ? "service" : "component"}
                files={asset.files}
              />
            </section>

            <GuideSection title="Installation Guide" content={asset.guides.installation} />
            <GuideSection title="Usage Guide" content={asset.guides.usage} />
            <GuideSection title="Documentation" content={asset.guides.documentation} />

            {asset.included_resources.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-6 border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-widest text-slate-900">
                  Included Resources
                </h2>
                <ul className="space-y-4">
                  {asset.included_resources.map((resource, index) => (
                    <li key={`${resource.name}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-900">{resource.name}</p>
                      {resource.description && (
                        <p className="mt-1 text-sm text-slate-500">{resource.description}</p>
                      )}
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex text-xs font-bold uppercase tracking-widest text-blue-600 hover:underline"
                        >
                          Open Resource
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {asset.changelog.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-6 border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-widest text-slate-900">
                  Version History
                </h2>
                <div className="space-y-4">
                  {asset.changelog.map((entry, index) => (
                    <div key={`${entry.version}-${index}`} className="relative border-l-2 border-slate-200 pl-5">
                      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-blue-600" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                        v{entry.version}
                        {entry.date ? (
                          <span className="ml-2 font-bold normal-case text-slate-400">{formatDate(entry.date)}</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{entry.notes}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {asset.builder_reviews.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-6 border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-widest text-slate-900">
                  Creator Reviews
                </h2>
                <div className="space-y-4">
                  {asset.builder_reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-black text-amber-500">
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      {review.review && <p className="text-sm text-slate-600">{review.review}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Access</p>
                <p className="mt-1 text-2xl font-black text-green-600">Owned</p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Full download access for your purchased AI Solution.
                </p>

                <Link
                  href={`/buyer/library/${asset.id}#files`}
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-slate-900 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600"
                >
                  Browse All Files
                </Link>
              </div>

              {asset.builder && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Created By</p>
                  <div className="mt-4 flex items-center gap-4">
                    {asset.builder.avatar_url ? (
                      <Image
                        src={asset.builder.avatar_url}
                        width={56}
                        height={56}
                        alt={builderName}
                        className="rounded-2xl border-2 border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-lg font-black text-slate-200">
                        {builderName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="text-lg font-black text-white">{builderName}</h4>
                      <p className="line-clamp-2 text-xs font-medium text-slate-400">
                        {asset.builder.headline || "Elite Mesh Contributor"}
                      </p>
                      {asset.builder.review_count != null && asset.builder.review_count > 0 && (
                        <p className="mt-1 text-xs font-bold text-amber-400">
                          ★ {Number(asset.builder.average_rating ?? 0).toFixed(1)} · {asset.builder.review_count}{" "}
                          reviews
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/profile/${asset.builder.id}`}
                    className="mt-5 block w-full rounded-xl bg-slate-800 py-3 text-center text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-slate-900"
                  >
                    View Profile
                  </Link>
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Support</h3>
                <div className="mt-4 space-y-3">
                  {contactHref ? (
                    <Link
                      href={contactHref}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      Contact Creator
                    </Link>
                  ) : asset.component.builder_id ? (
                    <button
                      type="button"
                      onClick={() => setShowContactModal(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      Contact Creator
                    </button>
                  ) : null}

                  <Link
                    href={reportHref}
                    className="flex w-full items-center justify-center rounded-xl border border-rose-100 bg-rose-50 py-3 text-xs font-black uppercase tracking-widest text-rose-600 transition-colors hover:bg-rose-100"
                  >
                    Report an Issue
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showContactModal && asset.component.builder_id && (
        <CustomProjectModal
          builderId={asset.component.builder_id}
          builderName={builderName}
          onClose={() => setShowContactModal(false)}
          onSuccess={(conversationId) => router.push(`/buyer/messages?conversation=${conversationId}`)}
        />
      )}
    </div>
  );
}
