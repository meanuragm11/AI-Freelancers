import type { SupabaseClient } from '@supabase/supabase-js';



export async function recordArenaEvent(

  supabaseAdmin: SupabaseClient,

  builderId: string,

  eventType: string,

  dedupeKey: string,

  payload: Record<string, unknown> = {}

): Promise<void> {

  const idempotencyKey = `${builderId}:${eventType}:${dedupeKey}`;



  await supabaseAdmin.from('arena_events').upsert(

    {

      builder_id: builderId,

      event_type: eventType,

      payload,

      idempotency_key: idempotencyKey,

    },

    { onConflict: 'idempotency_key', ignoreDuplicates: true }

  );

}



export async function recordArenaMilestone(

  supabaseAdmin: SupabaseClient,

  builderId: string,

  milestoneKey: string

): Promise<void> {

  await supabaseAdmin.from('arena_milestones').upsert(

    {

      builder_id: builderId,

      milestone_key: milestoneKey,

      achieved_at: new Date().toISOString(),

    },

    { onConflict: 'builder_id,milestone_key', ignoreDuplicates: true }

  );

}

