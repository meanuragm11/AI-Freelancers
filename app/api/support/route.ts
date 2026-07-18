import { NextResponse } from 'next/server';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  type SupportPriority,
} from '@/lib/support/constants';
import {
  getAuthenticatedUser,
  getProfileName,
  supabaseAdmin,
  ticketDetailPath,
  normalizeAttachments,
} from '@/lib/support/server';
import { founderTicketDetailPath, notifyFounderAdmins } from '@/lib/support/founderNotifications';
import { logBusinessEvent } from '@/lib/events/businessEvents';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select(
        'id, ticket_number, category, subject, status, priority, created_at, updated_at'
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tickets: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      category,
      subject,
      description,
      priority = 'medium',
      email,
      name,
      transactionId,
      escrowId,
      projectId,
      serviceId,
      aiAssetId,
      attachments,
    } = body;

    if (!category || !subject || !description || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!SUPPORT_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    if (!SUPPORT_PRIORITIES.includes(priority as SupportPriority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    const profileName = name?.trim() || (await getProfileName(user.id));
    const contactEmail = email.trim();
    const safeAttachments = normalizeAttachments(attachments);

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: user.id,
        name: profileName,
        email: contactEmail,
        category,
        subject: subject.trim(),
        message: description.trim(),
        priority,
        status: 'open',
        transaction_id: transactionId || null,
        escrow_id: escrowId || null,
        project_id: projectId || null,
        service_id: serviceId || null,
        ai_asset_id: aiAssetId || null,
      })
      .select(
        'id, ticket_number, category, subject, status, priority, created_at, updated_at'
      )
      .single();

    if (ticketError) throw ticketError;

    const { error: messageError } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: 'user',
        body: description.trim(),
        attachments: safeAttachments,
      });

    if (messageError) throw messageError;

    void logBusinessEvent({
      eventType: 'support_ticket.created',
      entityType: 'support_ticket',
      entityId: ticket.id,
      actorId: user.id,
      summary: `Support ticket ${ticket.ticket_number} created`,
      metadata: { category, priority, subject: subject.trim() },
    });

    const ticketLink = ticketDetailPath(ticket.ticket_number);

    await sendNotification({
      type: NotificationType.SUPPORT_TICKET,
      recipientId: user.id,
      recipientEmail: contactEmail,
      title: 'Support ticket received',
      message: `We received your request (${ticket.ticket_number}) regarding "${subject.trim()}". Our team will respond soon.`,
      link: ticketLink,
      metadata: {
        ticketNumber: ticket.ticket_number,
        category,
        priority,
        idempotencyKey: `support-ticket:${ticket.id}:created`,
      },
    });

    void notifyFounderAdmins({
      title: `New support ticket · ${ticket.ticket_number}`,
      message: `"${subject.trim()}" (${category})`,
      link: founderTicketDetailPath(ticket.id),
      idempotencyKey: `support-ticket:${ticket.id}:new`,
    });

    return NextResponse.json({
      success: true,
      ticket,
      ticketNumber: ticket.ticket_number,
      ticketId: ticket.id,
    });
  } catch (error: unknown) {
    console.error('Support API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
