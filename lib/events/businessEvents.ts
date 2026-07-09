import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export type BusinessEventEntityType =
  | 'collab'
  | 'transaction'
  | 'dispute'
  | 'support_ticket'
  | 'withdrawal'
  | 'refund_request'
  | 'profile'
  | 'open_project'
  | 'open_project_proposal';

export type BusinessEventInput = {
  eventType: string;
  entityType: BusinessEventEntityType;
  entityId?: string | null;
  collabId?: string | null;
  actorId?: string | null;
  amountUsd?: number | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Appends an entry to the immutable, platform-wide business events ledger
 * (payments, escrow, disputes, withdrawals, refunds, moderation, etc).
 * Drives the founder's 360-degree timeline views (per collab/dispute/ticket/user).
 * Best-effort: never throws, so a logging failure cannot block the underlying action.
 */
export async function logBusinessEvent({
  eventType,
  entityType,
  entityId,
  collabId,
  actorId,
  amountUsd,
  summary,
  metadata,
}: BusinessEventInput) {
  try {
    await supabaseAdmin.from('business_events').insert({
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId ?? null,
      collab_id: collabId ?? null,
      actor_id: actorId ?? null,
      amount_usd: amountUsd ?? null,
      summary: summary ?? null,
      metadata: metadata ?? {},
    });
  } catch (eventError) {
    console.error('Failed to write business event:', eventError);
  }
}
