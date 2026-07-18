import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';
import { normalizeAttachments } from '@/lib/support/server';
import { SUPPORT_STATUSES, type SupportStatus } from '@/lib/support/constants';
import { isUuid } from '@/lib/founder/utils';
import { logBusinessEvent } from '@/lib/events/businessEvents';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const [{ data: messages, error: messagesError }, { data: user }, { data: notes }] = await Promise.all([
      supabaseAdmin
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('profiles')
        .select(
          'id, full_name, role, is_freelancer, is_admin, is_verified, kyc_status, average_rating, review_count, created_at, last_active_at'
        )
        .eq('id', ticket.user_id)
        .maybeSingle(),
      supabaseAdmin
        .from('admin_internal_notes')
        .select('id, body, created_at, created_by, profiles:created_by(full_name)')
        .eq('entity_type', 'support_ticket')
        .eq('entity_id', ticket.id)
        .order('created_at', { ascending: false }),
    ]);

    if (messagesError) throw messagesError;

    const related: Record<string, unknown> = {};

    if (isUuid(ticket.transaction_id)) {
      const { data } = await supabaseAdmin
        .from('transactions')
        .select('id, order_id, transaction_type, amount_usd, fee_usd, status, created_at')
        .eq('id', ticket.transaction_id)
        .maybeSingle();
      related.transaction = data ?? null;
    }

    if (isUuid(ticket.escrow_id)) {
      const { data } = await supabaseAdmin
        .from('collabs')
        .select('id, title, status, escrow_amount_usd, buyer_id, builder_id')
        .eq('id', ticket.escrow_id)
        .maybeSingle();
      related.escrow = data ?? null;
    }

    if (isUuid(ticket.project_id)) {
      const { data } = await supabaseAdmin
        .from('collabs')
        .select('id, title, status, escrow_amount_usd, buyer_id, builder_id, created_at')
        .eq('id', ticket.project_id)
        .maybeSingle();
      related.project = data ?? null;
    }

    if (isUuid(ticket.service_id)) {
      const { data } = await supabaseAdmin
        .from('services')
        .select('id, title, status, starting_price_usd, builder_id')
        .eq('id', ticket.service_id)
        .maybeSingle();
      related.service = data ?? null;
    }

    if (isUuid(ticket.ai_asset_id)) {
      const { data } = await supabaseAdmin
        .from('components')
        .select('id, title, status, price_usd, builder_id')
        .eq('id', ticket.ai_asset_id)
        .maybeSingle();
      related.legacySolution = data ?? null;
    }

    return NextResponse.json({
      ticket,
      messages: (messages ?? []).map((message) => ({
        ...message,
        attachments: normalizeAttachments(message.attachments),
      })),
      user,
      notes: notes ?? [],
      related,
    });
  } catch (error: unknown) {
    console.error('Founder ticket detail error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status, assigned_to')
      .eq('id', id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!SUPPORT_STATUSES.includes(body.status as SupportStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.assignedTo !== undefined) {
      updates.assigned_to = body.assignedTo || null;
    }

    if (body.priority !== undefined) {
      updates.priority = body.priority;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    await logAdminAction({
      actor: auth.actor,
      action: updates.status === 'resolved' ? 'support_ticket.resolve' : 'support_ticket.update',
      targetType: 'support_ticket',
      targetId: id,
      previousValue: existing,
      newValue: updates,
    });

    void logBusinessEvent({
      eventType: updates.status === 'resolved' ? 'support_ticket.resolved' : 'support_ticket.updated',
      entityType: 'support_ticket',
      entityId: id,
      actorId: auth.actor.id,
      summary: `Support ticket ${updates.status === 'resolved' ? 'resolved' : 'updated'}`,
      metadata: { updates },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error: unknown) {
    console.error('Founder ticket update error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
