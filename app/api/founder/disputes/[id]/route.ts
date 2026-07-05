import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';
import { logBusinessEvent } from '@/lib/events/businessEvents';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select(
        `*, buyer:buyer_id(id, full_name, is_verified, kyc_status, created_at),
         freelancer:freelancer_id(id, full_name, is_verified, kyc_status, created_at),
         collab:collab_id(id, title, status, escrow_amount_usd, payment_type, created_at)`
      )
      .eq('id', id)
      .maybeSingle();

    if (disputeError) throw disputeError;
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const [{ data: timeline }, { data: evidence }, { data: messages }, { data: notes }, { data: refunds }, { data: refundableTransactions }] = await Promise.all([
      supabaseAdmin
        .from('dispute_timeline_entries')
        .select('*, actor:actor_id(full_name)')
        .eq('dispute_id', dispute.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('dispute_evidence')
        .select('*')
        .eq('dispute_id', dispute.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('messages')
        .select('id, sender_id, content, text, created_at, message_kind, system_event_type')
        .eq('collab_id', dispute.collab_id)
        .order('created_at', { ascending: true })
        .limit(200),
      supabaseAdmin
        .from('admin_internal_notes')
        .select('id, body, created_at, created_by, author:created_by(full_name)')
        .eq('entity_type', 'dispute')
        .eq('entity_id', dispute.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('refund_requests')
        .select('*')
        .eq('collab_id', dispute.collab_id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('transactions')
        .select('id, amount_usd, status, razorpay_payment_id, transaction_type, created_at')
        .eq('buyer_id', dispute.buyer_id)
        .eq('status', 'completed')
        .not('razorpay_payment_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      dispute,
      timeline: timeline ?? [],
      evidence: evidence ?? [],
      messages: messages ?? [],
      notes: notes ?? [],
      refunds: refunds ?? [],
      refundableTransactions: refundableTransactions ?? [],
    });
  } catch (error: unknown) {
    console.error('Founder dispute detail error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const RESOLVABLE_STATUSES = ['resolved', 'closed'];

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, resolutionSummary, resolutionType, decisionNote } = body;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('disputes')
      .select('id, status, collab_id')
      .eq('id', id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (status) {
      updates.status = status;
      if (RESOLVABLE_STATUSES.includes(status)) {
        updates.resolved_by = auth.actor.id;
        updates.resolved_at = new Date().toISOString();
        if (status === 'closed') updates.closed_at = new Date().toISOString();
      }
    }
    if (resolutionSummary !== undefined) updates.resolution_summary = resolutionSummary;
    if (resolutionType !== undefined) updates.resolution_type = resolutionType;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('disputes')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    await supabaseAdmin.from('dispute_timeline_entries').insert({
      dispute_id: id,
      collab_id: existing.collab_id,
      actor_id: auth.actor.id,
      actor_role: 'admin',
      entry_type: status ? 'admin_decision' : 'admin_note',
      description:
        decisionNote?.trim() ||
        resolutionSummary?.trim() ||
        `Founder updated dispute${status ? ` status to ${status}` : ''}.`,
      metadata: { updates },
    });

    await logAdminAction({
      actor: auth.actor,
      action: 'dispute.update',
      targetType: 'dispute',
      targetId: id,
      previousValue: existing,
      newValue: updates,
    });

    void logBusinessEvent({
      eventType: status ? `dispute.${status}` : 'dispute.updated',
      entityType: 'dispute',
      entityId: id,
      collabId: existing.collab_id,
      actorId: auth.actor.id,
      summary: decisionNote?.trim() || resolutionSummary?.trim() || `Founder updated dispute${status ? ` status to ${status}` : ''}`,
      metadata: { updates },
    });

    return NextResponse.json({ dispute: updated });
  } catch (error: unknown) {
    console.error('Founder dispute update error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
