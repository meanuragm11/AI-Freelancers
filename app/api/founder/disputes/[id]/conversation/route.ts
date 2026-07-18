import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select('id, collab_id')
      .eq('id', id)
      .maybeSingle();

    if (disputeError) throw disputeError;
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, content, text, created_at, message_kind, system_event_type')
      .eq('collab_id', dispute.collab_id)
      .order('created_at', { ascending: true })
      .limit(300);

    if (error) throw error;

    const senderIds = Array.from(new Set((messages ?? []).map((row) => row.sender_id).filter(Boolean)));
    const { data: profiles } = senderIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', senderIds)
      : { data: [] };

    const namesById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

    return NextResponse.json({
      messages: (messages ?? []).map((message) => ({
        ...message,
        sender_name: namesById.get(message.sender_id) || 'System',
        body: message.text || message.content,
      })),
    });
  } catch (error: unknown) {
    console.error('Founder dispute conversation error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
