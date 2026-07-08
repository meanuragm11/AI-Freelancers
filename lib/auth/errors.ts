import type { AuthError } from "@supabase/supabase-js";

const STALE_USER_MESSAGE = "User from sub claim in JWT does not exist";

export function isStaleAuthSessionError(error: AuthError | null | undefined): boolean {
  if (!error) return false;

  return (
    error.message.includes(STALE_USER_MESSAGE) ||
    error.code === "user_not_found"
  );
}
