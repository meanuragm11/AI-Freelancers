"use client";

import Image from "next/image";
import Link from "next/link";

export type LibraryAssetCardData = {
  id: string;
  purchased_at: string;
  version: string;
  asset_type: string;
  component_id: string;
  has_download: boolean;
  components: {
    id: string;
    title: string | null;
    category: string | null;
    thumbnail_url: string | null;
    builder_id: string | null;
  };
  builder: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type LibraryAssetCardProps = {
  asset: LibraryAssetCardData;
  onDownload: (componentId: string) => void;
  downloading: boolean;
  conversationId?: string | null;
};

function formatPurchaseDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LibraryAssetCard({
  asset,
  onDownload,
  downloading,
  conversationId,
}: LibraryAssetCardProps) {
  const componentId = asset.components.id;
  const creatorName = asset.builder?.full_name || "Verified Creator";
  const contactHref = conversationId
    ? `/buyer/messages?conversation=${conversationId}`
    : asset.builder?.id
      ? `/profile/${asset.builder.id}`
      : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {asset.components.thumbnail_url ? (
          <Image
            src={asset.components.thumbnail_url}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            alt={asset.components.title || "Asset thumbnail"}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">No Preview</span>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="rounded-lg bg-white/95 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-slate-800 shadow-sm backdrop-blur">
            {asset.asset_type}
          </span>
          <span className="rounded-lg bg-slate-900/80 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white backdrop-blur">
            v{asset.version}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="mb-4 space-y-2">
          <h3 className="line-clamp-2 text-lg font-black leading-tight text-slate-900">
            {asset.components.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700 ring-1 ring-blue-100">
              {asset.components.category}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{formatPurchaseDate(asset.purchased_at)}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {asset.builder?.avatar_url ? (
              <Image
                src={asset.builder.avatar_url}
                width={24}
                height={24}
                alt={creatorName}
                className="rounded-lg object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                {creatorName.charAt(0)}
              </div>
            )}
            <p className="text-xs font-semibold text-slate-600">{creatorName}</p>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <Link
            href={`/buyer/library/${asset.id}`}
            className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-600"
          >
            Open Asset
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDownload(componentId)}
              disabled={!asset.has_download || downloading}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? "Loading..." : "Download"}
            </button>
            <Link
              href={`/buyer/library/${asset.id}`}
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-100"
            >
              View Details
            </Link>
          </div>

          {contactHref && (
            <Link
              href={contactHref}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Contact Creator
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
