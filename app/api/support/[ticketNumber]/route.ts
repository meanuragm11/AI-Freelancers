import { NextResponse } from 'next/server';
import { SUPPORT_STATUSES, type SupportStatus } from '@/lib/support/constants';
import {
  getAuthenticatedUser,
  supabaseAdmin,
  normalizeAttachments,
} from '@/lib/support/server';

type RouteParams = { params: Promise<{ ticketNumber: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketNumber } = await params;

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

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({
      ticket,
      messages: (messages ?? []).map((message) => ({
        ...message,
        attachments: normalizeAttachments(message.attachments),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketNumber } = await params;
    const body = await req.json();
    const action = body.action as string | undefined;

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

    if (action === 'reopen') {
      if (!['resolved', 'closed'].includes(ticket.status)) {
        return NextResponse.json(
          { error: 'Only resolved or closed tickets can be reopened' },
          { status: 400 }
        );
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', ticket.id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      await supabaseAdmin.from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: 'system',
        body: 'Ticket reopened by user.',
        attachments: [],
      });

      return NextResponse.json({ ticket: updated });
    }

    if (action === 'request_arbitration') {
      if (!['resolved', 'closed'].includes(ticket.status)) {
        return NextResponse.json(
          { error: 'Only resolved or closed tickets can request arbitration' },
          { status: 400 }
        );
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'arbitration_requested' })
        .eq('id', ticket.id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      await supabaseAdmin.from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: 'system',
        body: 'Arbitration requested by user. This ticket has been escalated for platform review.',
        attachments: [],
      });

      return NextResponse.json({ ticket: updated });
    }

    if (body.status) {
      const nextStatus = body.status as SupportStatus;
      if (!SUPPORT_STATUSES.includes(nextStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('support_tickets')
        .update({ status: nextStatus })
        .eq('id', ticket.id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ ticket: updated });
    }

    return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
