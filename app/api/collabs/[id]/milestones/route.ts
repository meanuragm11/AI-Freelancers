import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { ACTIVE_DISPUTE_STATUSES } from '@/lib/marketplace/status';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import {
  NEW_MILESTONE_FEE_THRESHOLD_USD,
  NEW_MILESTONE_PLATFORM_FEE_USD,
  collabHasAnyFundedMilestone,
  sumFundedNewMilestoneAmount,
} from '@/lib/milestones/platformFees';
import { postMilestoneChatMessage } from '@/lib/milestones/chatMessages';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const amount = Number(body.amount);
    if (!body.title || !body.description || !body.deliverables || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Title, description, deliverables, and amount are required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: collab, error: collabError } = await supabaseAdmin
      .from('collabs')
      .select(
        'id, title, buyer_id, builder_id, status, cumulative_new_milestones_fee_charged'
      )
      .eq('id', id)
      .maybeSingle();

    if (collabError) throw collabError;
    if (!collab || collab.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can add milestones' }, { status: 403 });
    }

    const isPostFundingAdd = await collabHasAnyFundedMilestone(supabaseAdmin, id);

    const { data: activeDispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select('id')
      .eq('collab_id', id)
      .in('status', ACTIVE_DISPUTE_STATUSES as unknown as string[])
      .maybeSingle();

    if (disputeError) throw disputeError;
    if (activeDispute) {
      return NextResponse.json({ error: 'Milestone creation is paused while a dispute is active.' }, { status: 409 });
    }

    const { count } = await supabaseAdmin
      .from('milestones')
      .select('id', { count: 'exact', head: true })
      .eq('collab_id', id);

    const alreadyFundedNewTotal = isPostFundingAdd
      ? await sumFundedNewMilestoneAmount(supabaseAdmin, id)
      : 0;
    const projectedAtPayment = alreadyFundedNewTotal + amount;
    const feeDueAtFunding =
      isPostFundingAdd &&
      !collab.cumulative_new_milestones_fee_charged &&
      projectedAtPayment >= NEW_MILESTONE_FEE_THRESHOLD_USD
        ? NEW_MILESTONE_PLATFORM_FEE_USD
        : 0;

    const { data: milestone, error: insertError } = await supabaseAdmin
      .from('milestones')
      .insert({
        collab_id: id,
        title: body.title,
        description: body.description,
        deliverables: body.deliverables,
        amount_usd: amount,
        due_date: body.due_date || null,
        notes: body.notes || null,
        status: 'draft',
        order_index: count ?? 0,
        is_new_milestone: isPostFundingAdd,
      })
      .select('id, title, amount_usd')
      .single();

    if (insertError) throw insertError;

    await postMilestoneChatMessage(supabaseAdmin, {
      collabId: id,
      senderId: user.id,
      milestoneId: milestone.id,
      event: 'created',
      title: milestone.title,
      amountUsd: Number(milestone.amount_usd),
    });

    if (collab.builder_id) {
      void sendNotification({
        type: NotificationType.MILESTONE_PROPOSED,
        recipientId: collab.builder_id,
        title: 'New milestone added',
        message: `${body.title} was added to the project workspace.`,
        link: `/builder/inbox?conversation=${id}`,
        metadata: {
          collabId: id,
          projectName: collab.title || 'Your project',
          milestoneId: milestone.id,
          actorId: user.id,
          idempotencyKey: `milestone-created:${milestone.id}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      milestoneId: milestone.id,
      projectedAtPayment,
      platformFeeDueAtFunding: feeDueAtFunding,
      isPostFundingAdd,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Milestone creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
