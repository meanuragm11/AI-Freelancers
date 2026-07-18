import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { normalizeAttachments } from '@/lib/support/server';
import type { SupportAttachment } from '@/lib/support/types';

type RouteParams = { params: Promise<{ id: string }> };

type AttachmentRow = SupportAttachment & {
  source: 'ticket' | 'message';
  uploaded_at: string;
  message_id?: string;
};

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, created_at')
      .eq('id', id)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('support_ticket_messages')
      .select('id, attachments, created_at')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    const attachments: AttachmentRow[] = [];

    for (const message of messages ?? []) {
      for (const attachment of normalizeAttachments(message.attachments)) {
        attachments.push({
          ...attachment,
          source: 'message',
          uploaded_at: message.created_at,
          message_id: message.id,
        });
      }
    }

    return NextResponse.json({ attachments });
  } catch (error: unknown) {
    console.error('Founder ticket attachments error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
