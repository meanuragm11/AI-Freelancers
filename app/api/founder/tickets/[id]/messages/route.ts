import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { normalizeAttachments, ticketDetailPath } from '@/lib/support/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { body: messageBody, attachments, isInternal } = body;

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
        is_internal: Boolean(isInternal),
      })
      .select('*')
      .single();

    if (messageError) throw messageError;

    // A public staff reply nudges the ticket back to "waiting for user";
    // internal notes never change customer-facing status.
    let updatedStatus = ticket.status;
    if (!isInternal && ticket.status !== 'closed') {
      updatedStatus = 'waiting_for_user';
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: updatedStatus })
        .eq('id', ticket.id);
    }

    if (!isInternal) {
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
    }

    await logAdminAction({
      actor: auth.actor,
      action: isInternal ? 'support_ticket.internal_note' : 'support_ticket.reply',
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
