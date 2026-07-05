import { NextResponse } from 'next/server';

import { logAdminAction, requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { logBusinessEvent } from '@/lib/events/businessEvents';



type RouteParams = { params: Promise<{ id: string }> };



type WithdrawalStatus =

  | 'requested'

  | 'pending_review'

  | 'approved'

  | 'rejected'

  | 'processing'

  | 'completed'

  | 'failed'

  | 'cancelled';



const VALID_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {

  requested: ['pending_review', 'approved', 'rejected', 'cancelled'],

  pending_review: ['approved', 'rejected', 'cancelled'],

  approved: ['processing', 'rejected', 'cancelled'],

  rejected: [],

  processing: ['completed', 'failed'],

  completed: [],

  failed: [],

  cancelled: [],

};



export async function PATCH(req: Request, { params }: RouteParams) {

  const auth = await requireFounder();

  if (!auth.ok) return auth.response;



  try {

    const { id } = await params;

    const body = (await req.json()) as {

      status?: WithdrawalStatus;

      rejectionReason?: string;

      failureReason?: string;

    };



    if (!body.status) {

      return NextResponse.json({ error: 'status is required' }, { status: 400 });

    }



    const { data: existing, error: fetchError } = await supabaseAdmin

      .from('builder_withdrawals')

      .select('id, builder_id, amount_usd, status, reference_code')

      .eq('id', id)

      .maybeSingle();



    if (fetchError) throw fetchError;

    if (!existing) {

      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });

    }



    const currentStatus = existing.status as WithdrawalStatus;

    const nextStatus = body.status;



    if (!VALID_TRANSITIONS[currentStatus]?.includes(nextStatus)) {

      return NextResponse.json(

        { error: `Cannot transition from ${currentStatus} to ${nextStatus}` },

        { status: 409 }

      );

    }



    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = { status: nextStatus };



    if (['approved', 'rejected'].includes(nextStatus)) {

      updatePayload.reviewed_at = now;

      updatePayload.reviewed_by = auth.actor.id;

    }



    if (nextStatus === 'rejected') {

      updatePayload.rejection_reason = body.rejectionReason?.trim() || 'Rejected by reviewer';

    }



    if (nextStatus === 'failed') {

      updatePayload.failure_reason = body.failureReason?.trim() || 'Payout failed';

    }



    if (nextStatus === 'completed') {

      updatePayload.completed_at = now;

    }



    const { data: updated, error: updateError } = await supabaseAdmin

      .from('builder_withdrawals')

      .update(updatePayload)

      .eq('id', id)

      .select(

        'id, builder_id, amount_usd, status, reference_code, failure_reason, rejection_reason, created_at, completed_at, reviewed_at'

      )

      .single();



    if (updateError) throw updateError;



    await logAdminAction({

      actor: auth.actor,

      action: `withdrawal.${nextStatus}`,

      targetType: 'builder_withdrawal',

      targetId: id,

      metadata: {

        builderId: existing.builder_id,

        referenceCode: existing.reference_code,

      },

      previousValue: { status: currentStatus },

      newValue: { status: nextStatus },

    });



    void logBusinessEvent({

      eventType: `withdrawal.${nextStatus}`,

      entityType: 'withdrawal',

      entityId: id,

      actorId: existing.builder_id,

      amountUsd: Number(existing.amount_usd),

      summary: `Withdrawal ${nextStatus} (${existing.reference_code || id})`,

    });



    return NextResponse.json({ withdrawal: updated });

  } catch (error: unknown) {

    const message = error instanceof Error ? error.message : 'Failed to update withdrawal';

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

