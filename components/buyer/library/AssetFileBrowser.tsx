"use client";

import React from "react";
import { useAssetDownload } from "./useAssetDownload";
import SecurePayloadModal from "./SecurePayloadModal";

export type AssetFileItem = {
  key: string;
  name: string;
  size: number | null;
  content_type: string | null;
  kind: "file" | "secure_text" | "legacy_url";
  previewable: boolean;
};

type AssetFileBrowserProps = {
  componentId: string;
  files: AssetFileItem[];
};

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(kind: AssetFileItem["kind"]) {
  if (kind === "secure_text") {
    return (
      <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

export default function AssetFileBrowser({ componentId, files }: AssetFileBrowserProps) {
  const { downloadAsset, securePayload, closeSecurePayload, isDownloading } = useAssetDownload();

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm font-semibold text-slate-500">No downloadable files are configured for this asset.</p>
      </div>
    );
  }

  const handlePreview = async (file: AssetFileItem) => {
    await downloadAsset(componentId, file.key);
  };

  return (
    <>
      <div className="space-y-3">
        {files.map((file) => {
          const busy = isDownloading(componentId, file.key);
          const sizeLabel = formatFileSize(file.size);

          return (
            <div
              key={file.key}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
                  {fileIcon(file.kind)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{file.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {file.kind === "secure_text" ? "Secure Text" : file.content_type || "Download"}
                    {sizeLabel ? ` · ${sizeLabel}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {file.previewable && (
                  <button
                    type="button"
                    onClick={() => handlePreview(file)}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                  >
                    {busy ? "Loading..." : "Preview"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => downloadAsset(componentId, file.key)}
                  disabled={busy}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {busy ? "..." : "Download"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {securePayload && (
        <SecurePayloadModal
          title={securePayload.title}
          payload={securePayload.payload}
          onClose={closeSecurePayload}
        />
      )}
    </>
  );
}
