import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { businessEventHref } from '@/lib/founder/overview';

const ACTIVITY_LIMIT = 25;

export async function GET() {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from('business_events')
      .select('id, event_type, entity_type, entity_id, collab_id, summary, created_at')
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_LIMIT);

    if (error) throw error;

    const events = (data ?? []).map((row) => ({
      id: row.id,
      time: row.created_at,
      event: row.event_type.replace(/[._]/g, ' '),
      reference: row.summary?.trim() || `${row.entity_type}${row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ''}`,
      href: businessEventHref(row.entity_type, row.entity_id, row.collab_id),
    }));

    return NextResponse.json({ events });
  } catch (error: unknown) {
    console.error('Founder overview activity error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
