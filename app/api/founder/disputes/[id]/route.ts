import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';
import { logBusinessEvent } from '@/lib/events/businessEvents';
import { loadDisputeParticipantSummaries } from '@/lib/disputes/participantSummary';
import {
  DISPUTE_STATUS_LABELS,
} from '@/lib/disputes/constants';
import {
  assertValidDecisionInput,
  canSaveDecision,
  canStartInvestigation,
  nextStatusAfterSaveDecision,
  paymentExecutionClosesDispute,
} from '@/lib/disputes/transitions';
import { notifyDisputeParticipants } from '@/lib/disputes/founderNotifications';
import { createFinanceIntegrationService } from '@/lib/finance/integration';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select(
        `id, collab_id, buyer_id, freelancer_id, status, priority, decision_type, decision_summary,
         buyer_split_pct, builder_split_pct, payment_execution_status, primary_reason, detailed_explanation,
         event_timeline, freelancer_response, escrow_frozen_at, investigation_started_at, decision_recorded_at,
         resolved_at, closed_at, created_at, updated_at, resolved_by,
         collab:collab_id(id, title, status, escrow_amount_usd, payment_type, created_at)`
      )
      .eq('id', id)
      .maybeSingle();

    if (disputeError) throw disputeError;
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const participants = await loadDisputeParticipantSummaries(
      supabaseAdmin,
      dispute.buyer_id,
      dispute.freelancer_id
    );

    return NextResponse.json({
      dispute: {
        ...dispute,
        short_id: dispute.id.slice(0, 8).toUpperCase(),
        status_label: DISPUTE_STATUS_LABELS[dispute.status] || dispute.status,
        can_start_investigation: canStartInvestigation(dispute.status),
        can_save_decision: canSaveDecision(dispute.status),
        execution_pending: dispute.status === 'waiting_for_payment_execution',
      },
      buyer: participants.buyer,
      builder: participants.builder,
    });
  } catch (error: unknown) {
    console.error('Founder dispute detail error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type PatchBody = {
  action?: 'start_investigation' | 'save_decision';
  decisionType?: string;
  decisionSummary?: string;
  buyerSplitPct?: number;
  builderSplitPct?: number;
};

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = (await req.json()) as PatchBody;
    const { action } = body;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('disputes')
      .select('id, status, collab_id, buyer_id, freelancer_id, decision_type, collab:collab_id(title)')
      .eq('id', id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const projectTitle = (existing.collab as { title?: string } | null)?.title || 'your project';
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    let timelineDescription = '';
    let timelineType = 'admin_action';

    if (action === 'start_investigation') {
      if (!canStartInvestigation(existing.status)) {
        return NextResponse.json({ error: 'Dispute is not in Open status' }, { status: 409 });
      }
      updates.status = 'under_investigation';
      updates.investigation_started_at = now;
      timelineType = 'investigation_started';
      timelineDescription = 'Founder moved the dispute to Under Investigation.';
    } else if (action === 'save_decision') {
      if (!canSaveDecision(existing.status)) {
        return NextResponse.json(
          { error: 'Decision can only be saved while the dispute is Open or Under Investigation' },
          { status: 409 }
        );
      }

      try {
        assertValidDecisionInput({
          decisionType: body.decisionType || 'pending',
          decisionSummary: body.decisionSummary || '',
          buyerSplitPct: body.buyerSplitPct,
          builderSplitPct: body.builderSplitPct,
        });
      } catch (validationError: unknown) {
        const message = validationError instanceof Error ? validationError.message : 'Invalid decision';
        return NextResponse.json({ error: message }, { status: 400 });
      }

      const nextStatus = nextStatusAfterSaveDecision(existing.status);
      updates.decision_type = body.decisionType;
      updates.decision_summary = body.decisionSummary?.trim();
      updates.decision_recorded_at = now;
      updates.resolved_by = auth.actor.id;
      updates.status = nextStatus;
      updates.payment_execution_status = paymentExecutionClosesDispute(body.decisionType || '')
        ? 'not_required'
        : 'pending';

      if (body.decisionType === 'split') {
        updates.buyer_split_pct = Number(body.buyerSplitPct);
        updates.builder_split_pct = Number(body.builderSplitPct);
      } else {
        updates.buyer_split_pct = null;
        updates.builder_split_pct = null;
      }

      if (existing.status === 'open') {
        updates.investigation_started_at = existing.status === 'open' ? now : undefined;
      }

      timelineType = 'decision_recorded';
      timelineDescription = `Founder recorded decision: ${body.decisionType?.replace(/_/g, ' ')}. ${body.decisionSummary?.trim()}`;

      if (paymentExecutionClosesDispute(body.decisionType || '')) {
        updates.status = 'closed';
        updates.closed_at = now;
        updates.resolved_at = now;
        updates.payment_execution_status = 'not_required';
        timelineDescription += ' Dispute cancelled — no payment execution required.';
      }
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
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
      entry_type: timelineType,
      description: timelineDescription,
      metadata: { updates },
    });

    await logAdminAction({
      actor: auth.actor,
      action: `dispute.${action}`,
      targetType: 'dispute',
      targetId: id,
      previousValue: existing,
      newValue: updates,
    });

    void logBusinessEvent({
      eventType: `dispute.${timelineType}`,
      entityType: 'dispute',
      entityId: id,
      collabId: existing.collab_id,
      actorId: auth.actor.id,
      summary: timelineDescription,
      metadata: { updates },
    });

    if (action === 'save_decision') {
      void notifyDisputeParticipants({
        buyerId: existing.buyer_id,
        builderId: existing.freelancer_id,
        collabId: existing.collab_id,
        projectTitle,
        title: 'Dispute decision recorded',
        message: `A founder decision was recorded for "${projectTitle}". Payment execution will follow in Payments.`,
        eventKey: `decision:${id}`,
        actorId: auth.actor.id,
      });

      if (paymentExecutionClosesDispute(body.decisionType || '')) {
        const finance = createFinanceIntegrationService(supabaseAdmin);
        void finance.recordDisputeSettled({
          disputeId: id,
          collabId: existing.collab_id,
          buyerId: existing.buyer_id,
          builderId: existing.freelancer_id,
          actorId: auth.actor.id,
          decisionType: body.decisionType ?? null,
        });
      }
    }

    return NextResponse.json({ dispute: updated });
  } catch (error: unknown) {
    console.error('Founder dispute update error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
