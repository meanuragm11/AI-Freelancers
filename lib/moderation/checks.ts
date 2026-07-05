import type { SupabaseClient } from '@supabase/supabase-js';

export type ModerationAction = 'publish' | 'accept_work' | 'withdraw' | 'message' | 'engage';

export class ModerationBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModerationBlockedError';
  }
}

/**
 * Thin wrapper around the `profile_can` Postgres function -- the single source of
 * truth for account moderation gates (see migration account_moderation_system).
 * Keeping the check in the database means RLS and API-layer checks can never drift.
 */
export async function assertProfileCan(
  client: SupabaseClient,
  userId: string,
  action: ModerationAction,
  friendlyMessage?: string
): Promise<void> {
  const { data, error } = await client.rpc('profile_can', { p_user_id: userId, p_action: action });
  if (error) throw error;
  if (data === false) {
    throw new ModerationBlockedError(friendlyMessage || 'This action is currently unavailable for this account.');
  }
}
