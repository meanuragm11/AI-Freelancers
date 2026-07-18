"use client";

import { useCallback, useState } from "react";

export type DownloadResult = {
  deliveryMethod: "secure_text" | "secure_url" | "file" | "legacy_url";
  title?: string;
  payload?: string;
  url?: string;
  fileName?: string;
  warning?: string;
};

type DownloadTarget = {
  itemId: string;
  itemType?: "component" | "service";
};

function downloadEndpoint({ itemId, itemType = "component" }: DownloadTarget) {
  return itemType === "service"
    ? `/api/solutions/${itemId}/download`
    : `/api/assets/${itemId}/download`;
}

export function useAssetDownload() {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [securePayload, setSecurePayload] = useState<{ title: string; payload: string } | null>(
    null
  );

  const downloadAsset = useCallback(
    async (
      target: DownloadTarget | string,
      fileKey = "primary"
    ): Promise<DownloadResult | null> => {
      const resolved =
        typeof target === "string" ? { itemId: target, itemType: "component" as const } : target;

      setDownloadingKey(`${resolved.itemId}:${fileKey}`);
      setError(null);

      try {
        const response = await fetch(downloadEndpoint(resolved), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Download failed");
        }

        if (result.deliveryMethod === "secure_text") {
          setSecurePayload({
            title: result.title || "Secure Payload",
            payload: result.payload,
          });
          return result as DownloadResult;
        }

        if (result.url) {
          window.open(result.url, "_blank", "noopener,noreferrer");
          return result as DownloadResult;
        }

        throw new Error("Download is not configured for this AI Solution.");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Download failed";
        setError(message);
        return null;
      } finally {
        setDownloadingKey(null);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);
  const closeSecurePayload = useCallback(() => setSecurePayload(null), []);

  const isDownloading = useCallback(
    (itemId: string, fileKey = "primary") => downloadingKey === `${itemId}:${fileKey}`,
    [downloadingKey]
  );

  return {
    downloadAsset,
    error,
    clearError,
    securePayload,
    closeSecurePayload,
    isDownloading,
    downloadingKey,
  };
}
