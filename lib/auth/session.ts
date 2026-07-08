import { supabase } from "@/lib/supabaseClient";
import { isStaleAuthSessionError } from "@/lib/auth/errors";

export { isStaleAuthSessionError } from "@/lib/auth/errors";

/** Validates the current session server-side and clears orphaned JWTs. */
export async function clearStaleAuthSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || isStaleAuthSessionError(error)) {
    await supabase.auth.signOut();
  }
}
