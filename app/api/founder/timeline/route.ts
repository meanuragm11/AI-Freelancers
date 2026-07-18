import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

/**
 * Founder-facing read endpoint over the immutable business_events ledger.
 * Supports filtering by a specific entity (dispute/ticket/withdrawal/refund/user)
 * or by collab, to power 360-degree case views.
 */
export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const collabId = searchParams.get('collabId');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);
    const ascending = searchParams.get('order') === 'asc';

    let query = supabaseAdmin
      .from('business_events')
      .select('*, actor:actor_id(id, full_name)')
      .order('created_at', { ascending })
      .limit(limit);

    if (entityType && entityId) {
      query = query.eq('entity_type', entityType).eq('entity_id', entityId);
    } else if (collabId) {
      query = query.eq('collab_id', collabId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ events: data ?? [] });
  } catch (error: unknown) {
    console.error('Founder timeline error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
