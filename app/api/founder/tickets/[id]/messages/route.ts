import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { logBusinessEvent } from '@/lib/events/businessEvents';
import { normalizeAttachments, ticketDetailPath } from '@/lib/support/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('support_ticket_messages')
      .select('id, ticket_id, sender_id, sender_role, body, attachments, is_internal, created_at')
      .eq('ticket_id', id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({
      messages: (messages ?? []).map((message) => ({
        ...message,
        attachments: normalizeAttachments(message.attachments),
      })),
    });
  } catch (error: unknown) {
    console.error('Founder ticket messages list error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { body: messageBody, attachments } = body;

    if (!messageBody?.trim() && !(Array.isArray(attachments) && attachments.length > 0)) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, ticket_number, subject, user_id, email, status')
      .eq('id', id)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const safeAttachments = normalizeAttachments(attachments);

    const { data: message, error: messageError } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: auth.actor.id,
        sender_role: 'staff',
        body: messageBody?.trim() || '',
        attachments: safeAttachments,
        is_internal: false,
      })
      .select('*')
      .single();

    if (messageError) throw messageError;

    let updatedStatus = ticket.status;
    if (ticket.status !== 'closed') {
      updatedStatus = 'waiting_for_user';
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: updatedStatus })
        .eq('id', ticket.id);
    }

    void logBusinessEvent({
      eventType: 'support_ticket.founder_replied',
      entityType: 'support_ticket',
      entityId: ticket.id,
      actorId: auth.actor.id,
      summary: `Founder replied on ${ticket.ticket_number}`,
      metadata: { messageId: message.id },
    });

    await sendNotification({
      type: NotificationType.SUPPORT_TICKET,
      recipientId: ticket.user_id,
      recipientEmail: ticket.email,
      title: `Update on your ticket ${ticket.ticket_number}`,
      message: `Zelance support replied to "${ticket.subject}".`,
      link: ticketDetailPath(ticket.ticket_number),
      metadata: {
        ticketNumber: ticket.ticket_number,
        idempotencyKey: `support-ticket:${ticket.id}:staff-reply:${message.id}`,
      },
    }).catch((notifyError) => console.error('Failed to notify user of staff reply:', notifyError));

    await logAdminAction({
      actor: auth.actor,
      action: 'support_ticket.reply',
      targetType: 'support_ticket',
      targetId: ticket.id,
      metadata: { messageId: message.id },
    });

    return NextResponse.json({
      message: { ...message, attachments: normalizeAttachments(message.attachments) },
      status: updatedStatus,
    });
  } catch (error: unknown) {
    console.error('Founder ticket reply error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
