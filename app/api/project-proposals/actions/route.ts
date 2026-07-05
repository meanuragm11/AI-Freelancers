import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import {
  buildProposalSnapshot,
  createNegotiationVersion,
} from '@/lib/project-proposals/service';
import { syncAcceptedProposalMilestones } from '@/lib/milestones/syncProposalMilestones';
import type { ProposalMilestone } from '@/lib/project-proposals/types';
import { assertProfileCan, ModerationBlockedError } from '@/lib/moderation/checks';

type ActionBody = {
  action?: 'accept' | 'decline' | 'reject' | 'counter_offer' | 'negotiate';
  negotiation_id?: string;
  project_request_id?: string;
  proposed_amount_usd?: number;
  proposed_milestones?: ProposalMilestone[];
  explanation?: string;
};

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as ActionBody;
    const { action, negotiation_id, project_request_id, proposed_amount_usd, proposed_milestones, explanation } = body;

    if (!action || !project_request_id) {
      return NextResponse.json({ error: 'Missing action or project_request_id' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: projectRequest, error: requestError } = await supabaseAdmin
      .from('project_requests')
      .select('*')
      .eq('id', project_request_id)
      .single();

    if (requestError || !projectRequest) {
      return NextResponse.json({ error: 'Project request not found' }, { status: 404 });
    }

    const isBuyer = projectRequest.buyer_id === user.id;
    const isBuilder = projectRequest.builder_id === user.id;
    if (!isBuyer && !isBuilder) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (['funded', 'completed', 'rejected'].includes(projectRequest.status)) {
      return NextResponse.json({ error: 'This proposal is no longer actionable' }, { status: 409 });
    }

    let currentNegotiation = null;
    if (negotiation_id) {
      const { data } = await supabaseAdmin
        .from('negotiation_history')
        .select('*')
        .eq('id', negotiation_id)
        .eq('project_request_id', project_request_id)
        .maybeSingle();
      currentNegotiation = data;
    }

    const baseAmount =
      proposed_amount_usd ??
      currentNegotiation?.proposed_amount_usd ??
      projectRequest.agreed_amount_usd ??
      projectRequest.budget_usd;

    const baseMilestones =
      proposed_milestones ??
      ((currentNegotiation?.proposed_milestones ?? []) as ProposalMilestone[]);

    if (action === 'accept') {
      if (!currentNegotiation) {
        return NextResponse.json({ error: 'negotiation_id is required to accept' }, { status: 400 });
      }
      if (currentNegotiation.proposed_by === user.id) {
        return NextResponse.json({ error: 'You cannot accept your own proposal' }, { status: 400 });
      }

      await assertProfileCan(
        supabaseAdmin,
        projectRequest.builder_id,
        'accept_work',
        'This builder account cannot accept new work at this time.'
      );

      await supabaseAdmin
        .from('negotiation_history')
        .update({ status: 'accepted' })
        .eq('id', currentNegotiation.id);

      await supabaseAdmin
        .from('project_requests')
        .update({
          status: 'accepted',
          agreed_amount_usd: Number(baseAmount ?? 0),
          accepted_negotiation_id: currentNegotiation.id,
        })
        .eq('id', project_request_id);

      if (projectRequest.conversation_id) {
        const collabPaymentType =
          projectRequest.payment_type === 'milestone_payment' ? 'milestone_based' : 'single_payment';

        await supabaseAdmin
          .from('collabs')
          .update({
            status: 'negotiating',
            fixed_price_usd: Number(baseAmount ?? 0),
            escrow_amount_usd: Number(baseAmount ?? 0),
            payment_type: collabPaymentType,
          })
          .eq('id', projectRequest.conversation_id);

        await syncAcceptedProposalMilestones(supabaseAdmin, projectRequest.conversation_id);

        await supabaseAdmin.from('messages').insert({
          collab_id: projectRequest.conversation_id,
          sender_id: user.id,
          text: `[[PROPOSAL_ACCEPTED|${currentNegotiation.id}]]`,
          content: `[[PROPOSAL_ACCEPTED|${currentNegotiation.id}]]`,
          message_kind: 'system',
          system_event_type: 'proposal_accepted',
        });
      }

      return NextResponse.json({ success: true, status: 'accepted', negotiationId: currentNegotiation.id });
    }

    if (action === 'decline' || action === 'reject') {
      if (isBuyer && action === 'decline') {
        return NextResponse.json({ error: 'Buyers should use reject' }, { status: 400 });
      }
      if (isBuilder && action === 'reject') {
        return NextResponse.json({ error: 'Builders should use decline' }, { status: 400 });
      }

      await createNegotiationVersion(supabaseAdmin, {
        projectRequest,
        proposedBy: user.id,
        proposalType: 'reject',
        proposedAmountUsd: Number(baseAmount ?? 0),
        proposedMilestones: baseMilestones,
        explanation: explanation ?? 'Proposal declined.',
        status: 'rejected',
      });

      await supabaseAdmin.from('project_requests').update({ status: 'rejected' }).eq('id', project_request_id);

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    if (action === 'counter_offer' || action === 'negotiate') {
      if (!baseAmount || Number(baseAmount) <= 0) {
        return NextResponse.json({ error: 'A valid proposed amount is required' }, { status: 400 });
      }

      if (
        projectRequest.payment_type === 'milestone_payment' &&
        (!baseMilestones || baseMilestones.length === 0)
      ) {
        return NextResponse.json({ error: 'At least one milestone is required' }, { status: 400 });
      }

      const snapshot = buildProposalSnapshot(projectRequest);
      snapshot.budget_usd = Number(baseAmount);

      const negotiation = await createNegotiationVersion(supabaseAdmin, {
        projectRequest: { ...projectRequest, negotiation_round: projectRequest.negotiation_round },
        proposedBy: user.id,
        proposalType: 'counter_offer',
        proposedAmountUsd: Number(baseAmount),
        proposedMilestones: baseMilestones,
        explanation: explanation ?? null,
        status: 'pending',
        snapshot,
      });

      await supabaseAdmin
        .from('project_requests')
        .update({ status: 'negotiating', agreed_amount_usd: Number(baseAmount) })
        .eq('id', project_request_id);

      return NextResponse.json({ success: true, status: 'negotiating', negotiationId: negotiation.id });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof ModerationBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Proposal action failed';
    console.error('Proposal action error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
