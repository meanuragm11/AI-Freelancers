import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: timeline, error } = await supabaseAdmin
      .from('dispute_timeline_entries')
      .select('id, actor_id, actor_role, entry_type, description, metadata, files, created_at, actor:actor_id(full_name)')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ timeline: timeline ?? [] });
  } catch (error: unknown) {
    console.error('Founder dispute history error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
