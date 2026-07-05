import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PLATFORM_FEE_USD,
  type ProposalCardPayload,
  type ProposalMilestone,
  type ProposalSnapshot,
  proposalCardMessage,
} from '@/lib/project-proposals/types';
import { areAllOriginalMilestonesFunded } from '@/lib/milestones/platformFees';

type ProjectRequestRow = {
  id: string;
  buyer_id: string;
  builder_id: string;
  title: string;
  description: string;
  budget_usd: number | null;
  expected_deadline: string | null;
  reference_links: string[] | null;
  required_technologies: string[] | null;
  attachment_urls: unknown[] | null;
  priority: string | null;
  additional_notes: string | null;
  payment_type: 'single_payment' | 'milestone_payment';
  status: string;
  conversation_id: string | null;
  negotiation_round: number | null;
  accepted_negotiation_id: string | null;
};

export function buildProposalSnapshot(request: ProjectRequestRow): ProposalSnapshot {
  return {
    title: request.title,
    description: request.description,
    payment_type: request.payment_type,
    budget_usd: request.budget_usd,
    expected_deadline: request.expected_deadline,
    reference_links: request.reference_links ?? [],
    required_technologies: request.required_technologies ?? [],
    attachment_urls: (request.attachment_urls ?? []) as ProposalSnapshot['attachment_urls'],
    priority: request.priority ?? 'normal',
    additional_notes: request.additional_notes,
  };
}

export async function postProposalCardMessage(
  supabaseAdmin: SupabaseClient,
  collabId: string,
  senderId: string,
  negotiationId: string
) {
  const message = proposalCardMessage(negotiationId);
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      collab_id: collabId,
      sender_id: senderId,
      text: message,
      content: message,
      message_kind: 'system',
      system_event_type: 'proposal_card',
    })
    .select('id')
    .single();

  if (error) throw error;

  if (data?.id) {
    void import('@/lib/messageNotifications').then(({ sendMessageNotificationForMessage }) =>
      sendMessageNotificationForMessage(data.id)
    );
  }

  return data;
}

export async function createNegotiationVersion(
  supabaseAdmin: SupabaseClient,
  params: {
    projectRequest: ProjectRequestRow;
    proposedBy: string;
    proposalType: 'initial' | 'counter_offer' | 'accept' | 'reject';
    proposedAmountUsd: number | null;
    proposedMilestones?: ProposalMilestone[];
    explanation?: string | null;
    snapshot?: ProposalSnapshot;
    status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  }
) {
  const nextVersion = (params.projectRequest.negotiation_round ?? 0) + 1;
  const snapshot = params.snapshot ?? buildProposalSnapshot(params.projectRequest);

  const { data: negotiation, error } = await supabaseAdmin
    .from('negotiation_history')
    .insert({
      project_request_id: params.projectRequest.id,
      proposed_by: params.proposedBy,
      proposal_type: params.proposalType,
      proposed_amount_usd: params.proposedAmountUsd,
      proposed_milestones: params.proposedMilestones ?? [],
      explanation: params.explanation ?? null,
      status: params.status ?? 'pending',
      version: nextVersion,
      proposal_snapshot: snapshot,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabaseAdmin
    .from('project_requests')
    .update({
      negotiation_round: nextVersion,
      agreed_amount_usd: params.proposedAmountUsd,
    })
    .eq('id', params.projectRequest.id);

  if (params.projectRequest.conversation_id) {
    await postProposalCardMessage(
      supabaseAdmin,
      params.projectRequest.conversation_id,
      params.proposedBy,
      negotiation.id
    );
  }

  return negotiation;
}

export async function getProposalCardPayload(
  supabaseAdmin: SupabaseClient,
  negotiationId: string,
  viewerId: string
): Promise<ProposalCardPayload> {
  const { data: negotiation, error } = await supabaseAdmin
    .from('negotiation_history')
    .select('*')
    .eq('id', negotiationId)
    .single();

  if (error || !negotiation) throw new Error('Proposal not found');

  const { data: projectRequest, error: requestError } = await supabaseAdmin
    .from('project_requests')
    .select('*')
    .eq('id', negotiation.project_request_id)
    .single();

  if (requestError || !projectRequest) throw new Error('Project request not found');

  if (projectRequest.buyer_id !== viewerId && projectRequest.builder_id !== viewerId) {
    throw new Error('Forbidden');
  }

  const { data: proposer } = await supabaseAdmin
    .from('profiles_public')
    .select('full_name, avatar_url')
    .eq('id', negotiation.proposed_by)
    .maybeSingle();

  const { data: previous } = await supabaseAdmin
    .from('negotiation_history')
    .select('proposed_amount_usd, proposed_milestones')
    .eq('project_request_id', negotiation.project_request_id)
    .lt('version', negotiation.version)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isAcceptedVersion =
    projectRequest.accepted_negotiation_id === negotiation.id ||
    (projectRequest.status === 'accepted' &&
      !projectRequest.accepted_negotiation_id &&
      negotiation.status === 'accepted');

  let isFullyFunded = false;
  if (isAcceptedVersion && projectRequest.conversation_id) {
    if (projectRequest.payment_type === 'single_payment') {
      isFullyFunded =
        projectRequest.status === 'funded' || projectRequest.status === 'completed';
    } else {
      isFullyFunded =
        projectRequest.status === 'completed' ||
        (await areAllOriginalMilestonesFunded(supabaseAdmin, projectRequest.conversation_id));
    }
  }

  const isLocked = isAcceptedVersion && isFullyFunded;
  const isAwaitingPayment =
    isAcceptedVersion &&
    projectRequest.status === 'accepted' &&
    !isFullyFunded;
  const isSuperseded = Boolean(
    projectRequest.accepted_negotiation_id &&
      projectRequest.accepted_negotiation_id !== negotiation.id
  );

  return {
    negotiation: {
      id: negotiation.id,
      version: negotiation.version,
      proposal_type: negotiation.proposal_type,
      proposed_amount_usd: negotiation.proposed_amount_usd,
      proposed_milestones: (negotiation.proposed_milestones ?? []) as ProposalMilestone[],
      explanation: negotiation.explanation,
      status: negotiation.status,
      created_at: negotiation.created_at,
      proposed_by: negotiation.proposed_by,
      proposal_snapshot: (negotiation.proposal_snapshot ?? {}) as ProposalSnapshot,
    },
    projectRequest: {
      id: projectRequest.id,
      status: projectRequest.status,
      payment_type: projectRequest.payment_type,
      conversation_id: projectRequest.conversation_id,
      buyer_id: projectRequest.buyer_id,
      builder_id: projectRequest.builder_id,
      accepted_negotiation_id: projectRequest.accepted_negotiation_id,
    },
    proposer: proposer ?? {},
    previousVersion: previous
      ? {
          proposed_amount_usd: previous.proposed_amount_usd,
          proposed_milestones: (previous.proposed_milestones ?? []) as ProposalMilestone[],
        }
      : null,
    platformFeeUsd: PLATFORM_FEE_USD,
    isLocked,
    isAwaitingPayment,
    isSuperseded,
  };
}

export async function markProjectRequestFunded(
  supabaseAdmin: SupabaseClient,
  projectRequestId: string,
  buyerId: string
) {
  const { data: request } = await supabaseAdmin
    .from('project_requests')
    .select('id, conversation_id, title, agreed_amount_usd, budget_usd, payment_type, accepted_negotiation_id')
    .eq('id', projectRequestId)
    .single();

  if (!request?.conversation_id) return;

  await supabaseAdmin.from('project_requests').update({ status: 'funded' }).eq('id', projectRequestId);

  if (request.accepted_negotiation_id) {
    await supabaseAdmin
      .from('negotiation_history')
      .update({ status: 'accepted' })
      .eq('id', request.accepted_negotiation_id);
  }

  const amount = Number(request.agreed_amount_usd ?? request.budget_usd ?? 0);
  const message = proposalCardMessage(request.accepted_negotiation_id ?? '');
  const fundedNotice = `[[PROPOSAL_FUNDED|${request.accepted_negotiation_id}]] Escrow funded for "${request.title}". Amount: $${amount.toLocaleString()} + $${PLATFORM_FEE_USD} platform fee.`;

  await supabaseAdmin.from('messages').insert({
    collab_id: request.conversation_id,
    sender_id: buyerId,
    text: fundedNotice,
    content: fundedNotice,
    message_kind: 'system',
    system_event_type: 'proposal_funded',
  });
}
