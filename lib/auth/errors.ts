import type { AuthError } from "@supabase/supabase-js";

const STALE_USER_MESSAGE = "User from sub claim in JWT does not exist";

export function isStaleAuthSessionError(error: AuthError | null | undefined): boolean {
  if (!error) return false;

  return (
    error.message.includes(STALE_USER_MESSAGE) ||
    error.code === "user_not_found"
  );
}

/** Supabase built-in email is capped at roughly 2–4 messages/hour per address on the free tier. Custom SMTP removes this limit. */
export function mapPasswordResetEmailError(error: unknown): string {
  if (error && typeof error === "object") {
    const authError = error as AuthError;
    const message = authError.message?.toLowerCase() ?? "";

    if (
      authError.code === "over_email_send_rate_limit" ||
      message.includes("rate limit")
    ) {
      return "Too many reset emails were sent recently. Wait about an hour before trying again, or check your inbox (and spam) for an earlier link.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to send reset email. Please try again.";
}
