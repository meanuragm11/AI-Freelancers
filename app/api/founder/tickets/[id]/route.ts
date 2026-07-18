import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';
import { formatProfileDisplayName } from '@/lib/display/formatDisplayName';
import {
  FOUNDER_TICKET_STATUSES,
  resolveFounderUserRole,
} from '@/lib/support/founderConstants';
import { founderTicketDetailPath, notifyFounderAdmins } from '@/lib/support/founderNotifications';
import { isUuid } from '@/lib/founder/utils';
import { logBusinessEvent } from '@/lib/events/businessEvents';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { ticketDetailPath } from '@/lib/support/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select(
        'id, ticket_number, user_id, name, email, category, subject, status, priority, transaction_id, escrow_id, project_id, service_id, ai_asset_id, created_at, updated_at'
      )
      .eq('id', id)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, full_name, role, is_freelancer, is_verified, verified_buyer, location, created_at'
      )
      .eq('id', ticket.user_id)
      .maybeSingle();

    if (userError) throw userError;

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

    let dispute = null;
    const collabId = ticket.escrow_id || ticket.project_id;
    if (isUuid(collabId)) {
      const { data } = await supabaseAdmin
        .from('disputes')
        .select('id, status, primary_reason, created_at')
        .eq('collab_id', collabId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      dispute = data ?? null;
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        display_name: formatProfileDisplayName(user, ticket.email),
      },
      user: user
        ? {
            id: user.id,
            display_name: formatProfileDisplayName(user, ticket.email),
            email: ticket.email,
            role: resolveFounderUserRole(user),
            country: user.location || null,
            member_since: user.created_at,
            is_verified_builder: Boolean(user.is_verified),
            verified_buyer: Boolean(user.verified_buyer),
          }
        : null,
      related: {
        ...related,
        dispute,
      },
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
      .select('id, ticket_number, subject, user_id, email, status, priority')
      .eq('id', id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!FOUNDER_TICKET_STATUSES.includes(body.status as (typeof FOUNDER_TICKET_STATUSES)[number])) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
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
      .select(
        'id, ticket_number, user_id, name, email, category, subject, status, priority, transaction_id, escrow_id, project_id, service_id, ai_asset_id, created_at, updated_at'
      )
      .single();

    if (updateError) throw updateError;

    const statusChanged = updates.status !== undefined && updates.status !== existing.status;
    const wasResolved =
      existing.status === 'resolved' || existing.status === 'closed';
    const isNowResolved = updates.status === 'resolved' || updates.status === 'closed';
    const reopened = statusChanged && wasResolved && !isNowResolved;

    await logAdminAction({
      actor: auth.actor,
      action:
        updates.status === 'resolved'
          ? 'support_ticket.resolve'
          : updates.status === 'closed'
            ? 'support_ticket.close'
            : reopened
              ? 'support_ticket.reopen'
              : 'support_ticket.update',
      targetType: 'support_ticket',
      targetId: id,
      previousValue: existing,
      newValue: updates,
    });

    if (statusChanged) {
      const eventType = reopened
        ? 'support_ticket.reopened'
        : updates.status === 'resolved'
          ? 'support_ticket.resolved'
          : updates.status === 'closed'
            ? 'support_ticket.closed'
            : 'support_ticket.status_changed';

      void logBusinessEvent({
        eventType,
        entityType: 'support_ticket',
        entityId: id,
        actorId: auth.actor.id,
        summary: `Support ticket ${existing.ticket_number} → ${updates.status}`,
        metadata: { previousStatus: existing.status, newStatus: updates.status },
      });

      void sendNotification({
        type: NotificationType.SUPPORT_TICKET,
        recipientId: existing.user_id,
        recipientEmail: existing.email,
        title:
          updates.status === 'resolved'
            ? `Ticket ${existing.ticket_number} resolved`
            : `Ticket ${existing.ticket_number} status updated`,
        message:
          updates.status === 'resolved'
            ? `Your support request "${existing.subject}" has been marked resolved.`
            : `Your ticket ${existing.ticket_number} is now ${String(updates.status).replace(/_/g, ' ')}.`,
        link: ticketDetailPath(existing.ticket_number),
        metadata: {
          ticketNumber: existing.ticket_number,
          idempotencyKey: `support-ticket:${existing.id}:status:${updates.status}:${Date.now()}`,
        },
      }).catch((notifyError) => console.error('Failed to notify customer of status change:', notifyError));

      if (reopened) {
        void notifyFounderAdmins({
          title: `Ticket reopened · ${existing.ticket_number}`,
          message: `"${existing.subject}" was reopened.`,
          link: founderTicketDetailPath(existing.id),
          idempotencyKey: `support-ticket:${existing.id}:reopened`,
        });
      }
    } else {
      void logBusinessEvent({
        eventType: 'support_ticket.updated',
        entityType: 'support_ticket',
        entityId: id,
        actorId: auth.actor.id,
        summary: `Support ticket ${existing.ticket_number} updated`,
        metadata: { updates },
      });
    }

    return NextResponse.json({ ticket: updated });
  } catch (error: unknown) {
    console.error('Founder ticket update error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
