import { NextResponse } from 'next/server';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import {
  getAuthenticatedUser,
  supabaseAdmin,
  ticketDetailPath,
  normalizeAttachments,
} from '@/lib/support/server';

type RouteParams = { params: Promise<{ ticketNumber: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketNumber } = await params;
    const body = await req.json();
    const messageBody = typeof body.body === 'string' ? body.body.trim() : '';
    const attachments = normalizeAttachments(body.attachments);

    if (!messageBody && attachments.length === 0) {
      return NextResponse.json(
        { error: 'Message body or attachment is required' },
        { status: 400 }
      );
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('ticket_number', ticketNumber)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (['closed'].includes(ticket.status)) {
      return NextResponse.json(
        { error: 'This ticket is closed. Reopen it to add messages.' },
        { status: 400 }
      );
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: 'user',
        body: messageBody || '(Attachment only)',
        attachments,
      })
      .select('*')
      .single();

    if (messageError) throw messageError;

    if (ticket.status === 'waiting_for_user') {
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', ticket.id);
    }

    await sendNotification({
      type: NotificationType.SUPPORT_TICKET,
      recipientId: user.id,
      recipientEmail: ticket.email,
      title: 'Message added to support ticket',
      message: `Your update on ticket ${ticket.ticket_number} was received.`,
      link: ticketDetailPath(ticket.ticket_number),
      metadata: {
        ticketNumber: ticket.ticket_number,
        idempotencyKey: `support-ticket:${ticket.id}:message:${message.id}`,
      },
    });

    return NextResponse.json({
      message: {
        ...message,
        attachments: normalizeAttachments(message.attachments),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
