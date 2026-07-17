"use client";

import NextImage, { type ImageProps } from "next/image";
import { shouldBypassNextImageOptimization } from "@/lib/images";

function resolveSrcString(src: ImageProps["src"]): string {
  if (typeof src === "string") return src;
  if (src && typeof src === "object" && "src" in src) return src.src;
  return "";
}

/**
 * Drop-in next/image replacement that serves Supabase storage URLs directly.
 * Next.js image optimization uses a hardcoded 7s upstream fetch timeout; large
 * Supabase uploads routinely exceed it and return 500 from /_next/image.
 */
export default function RemoteImage({ src, unoptimized, ...props }: ImageProps) {
  const bypass = unoptimized ?? shouldBypassNextImageOptimization(resolveSrcString(src));
  return <NextImage {...props} src={src} unoptimized={bypass} />;
}

export type { ImageProps };
