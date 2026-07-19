import type { ReadonlyURLSearchParams } from "next/navigation";

/** Parse Supabase auth params from the URL hash fragment (#access_token=...&type=recovery). */
export function parseAuthHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(raw);
}

/** True when Supabase sent a password recovery link (query or hash). */
export function isPasswordRecoveryUrl(
  searchParams: Pick<ReadonlyURLSearchParams, "get"> | URLSearchParams
): boolean {
  if (searchParams.get("type") === "recovery") return true;
  return parseAuthHashParams().get("type") === "recovery";
}

/** True when the URL hash contains Supabase auth tokens awaiting client exchange. */
export function hasAuthCallbackHash(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.includes("access_token");
}
