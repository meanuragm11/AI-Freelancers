import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

type RouteParams = { params: Promise<{ collabId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { collabId } = await params;

    const [collabRes, messagesRes, moderationRes] = await Promise.all([
      supabaseAdmin
        .from('collabs')
        .select('id, buyer_id, builder_id, title, buyer:buyer_id(full_name), builder:builder_id(full_name)')
        .eq('id', collabId)
        .maybeSingle(),
      supabaseAdmin
        .from('messages')
        .select('id, sender_id, content, created_at, is_flagged, is_hidden, moderation_status, sender:sender_id(full_name)')
        .eq('collab_id', collabId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('chat_moderation')
        .select('*')
        .eq('collab_id', collabId)
        .order('created_at', { ascending: false }),
    ]);

    if (!collabRes.data) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      collab: collabRes.data,
      messages: messagesRes.data ?? [],
      moderation: moderationRes.data ?? [],
    });
  } catch (error: unknown) {
    console.error('Founder conversation fetch error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
