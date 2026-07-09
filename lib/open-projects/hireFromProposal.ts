import type { SupabaseClient } from '@supabase/supabase-js';
import { logBusinessEvent } from '@/lib/events/businessEvents';
import { syncAcceptedProposalMilestones } from '@/lib/milestones/syncProposalMilestones';
import { proposalCardMessage } from '@/lib/project-proposals/types';
import type { ProposalMilestone } from '@/lib/project-proposals/types';
import { sendNotification } from '@/lib/notifications/notificationService';
import { NotificationType } from '@/lib/notifications/types';

export type HireFromProposalResult = {
  collabId: string;
  projectRequestId: string;
  negotiationId: string;
  checkoutUrl: string | null;
};

/**
 * Orchestrates hiring a builder from an open project proposal.
 * Creates collab + project_request + negotiation, rejects competing proposals,
 * and prepares escrow checkout via existing milestone flow.
 */
export async function hireFromProposal(
  supabaseAdmin: SupabaseClient,
  params: {
    projectId: string;
    proposalId: string;
    buyerId: string;
  }
): Promise<HireFromProposalResult> {
  const { projectId, proposalId, buyerId } = params;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('buyer_id', buyerId)
    .is('deleted_at', null)
    .single();

  if (projectError || !project) throw new Error('Project not found');
  if (project.status !== 'published') throw new Error('Project is not open for hiring');
  if (project.hired_proposal_id) throw new Error('A builder has already been hired for this project');

  const { data: proposal, error: proposalError } = await supabaseAdmin
    .from('project_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .single();

  if (proposalError || !proposal) throw new Error('Proposal not found');
  if (proposal.status !== 'submitted' && proposal.status !== 'shortlisted') {
    throw new Error('Proposal is not eligible for hire');
  }

  const builderId = proposal.builder_id;
  const proposedAmount = Number(proposal.proposed_amount_usd);
  const proposedMilestones = (proposal.proposed_milestones ?? []) as ProposalMilestone[];
  const paymentType = proposal.payment_type as 'single_payment' | 'milestone_payment';
  const deadline =
    project.deadline ??
    (proposal.proposed_duration_days
      ? new Date(Date.now() + proposal.proposed_duration_days * 86400000).toISOString().slice(0, 10)
      : null);

  const { data: skills } = await supabaseAdmin
    .from('project_skills')
    .select('skill')
    .eq('project_id', projectId);

  const requiredTechnologies = (skills ?? []).map((s: { skill: string }) => s.skill);

  const { data: collab, error: collabError } = await supabaseAdmin
    .from('collabs')
    .insert({
      buyer_id: buyerId,
      builder_id: builderId,
      title: project.title,
      project_description: project.description,
      status: 'negotiating',
      fixed_price_usd: proposedAmount,
      project_deadline: deadline,
      payment_type: paymentType === 'milestone_payment' ? 'milestone_based' : 'single_payment',
      open_project_id: projectId,
    })
    .select()
    .single();

  if (collabError) throw collabError;

  const { data: request, error: reqError } = await supabaseAdmin
    .from('project_requests')
    .insert({
      buyer_id: buyerId,
      builder_id: builderId,
      title: project.title,
      description: project.description,
      budget_usd: proposedAmount,
      expected_deadline: deadline,
      required_technologies: requiredTechnologies,
      status: 'accepted',
      conversation_id: collab.id,
      payment_type: paymentType,
      agreed_amount_usd: proposedAmount,
      open_project_id: projectId,
      hired_proposal_id: proposalId,
    })
    .select()
    .single();

  if (reqError) throw reqError;

  await supabaseAdmin
    .from('collabs')
    .update({ project_request_id: request.id })
    .eq('id', collab.id);

  const snapshot = {
    title: project.title,
    description: project.description,
    payment_type: paymentType,
    budget_usd: proposedAmount,
    expected_deadline: deadline,
    reference_links: [],
    required_technologies: requiredTechnologies,
    attachment_urls: [],
    priority: 'normal',
    additional_notes: proposal.cover_letter,
  };

  const { data: negotiation, error: negotiationError } = await supabaseAdmin
    .from('negotiation_history')
    .insert({
      project_request_id: request.id,
      proposed_by: builderId,
      proposal_type: 'initial',
      proposed_amount_usd: proposedAmount,
      proposed_milestones: proposedMilestones,
      explanation: proposal.cover_letter,
      status: 'accepted',
      version: 1,
      proposal_snapshot: snapshot,
    })
    .select('id')
    .single();

  if (negotiationError) throw negotiationError;

  await supabaseAdmin
    .from('project_requests')
    .update({
      negotiation_round: 1,
      agreed_amount_usd: proposedAmount,
      accepted_negotiation_id: negotiation.id,
    })
    .eq('id', request.id);

  const proposalMessage = proposalCardMessage(negotiation.id);
  await supabaseAdmin.from('messages').insert({
    collab_id: collab.id,
    sender_id: buyerId,
    text: proposalMessage,
    content: proposalMessage,
    message_kind: 'system',
    system_event_type: 'proposal_card',
  });

  await syncAcceptedProposalMilestones(supabaseAdmin, collab.id, { force: true });

  await supabaseAdmin
    .from('project_proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId);

  await supabaseAdmin.from('proposal_status_history').insert({
    proposal_id: proposalId,
    old_status: proposal.status,
    new_status: 'accepted',
    changed_by: buyerId,
    note: 'Hired by buyer',
  });

  const { data: otherProposals } = await supabaseAdmin
    .from('project_proposals')
    .select('id, builder_id, status')
    .eq('project_id', projectId)
    .neq('id', proposalId)
    .in('status', ['submitted', 'shortlisted']);

  for (const other of otherProposals ?? []) {
    await supabaseAdmin
      .from('project_proposals')
      .update({ status: 'rejected' })
      .eq('id', other.id);

    await supabaseAdmin.from('proposal_status_history').insert({
      proposal_id: other.id,
      old_status: other.status,
      new_status: 'rejected',
      changed_by: buyerId,
      note: 'Another proposal was hired',
    });

    void sendNotification({
      type: NotificationType.OPEN_PROJECT_PROPOSAL_REJECTED,
      recipientId: other.builder_id,
      title: 'Proposal not selected',
      message: `Your proposal for "${project.title}" was not selected. The buyer hired another expert.`,
      link: '/builder/proposals',
      metadata: { projectId, dashboardPath: '/builder/proposals' },
    });
  }

  await supabaseAdmin
    .from('projects')
    .update({
      status: 'hired',
      hired_builder_id: builderId,
      hired_proposal_id: proposalId,
      collab_id: collab.id,
      project_request_id: request.id,
      closed_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  void sendNotification({
    type: NotificationType.OPEN_PROJECT_HIRED,
    recipientId: builderId,
    title: 'You were hired!',
    message: `Congratulations! You were hired for "${project.title}". Proceed to the collab workspace.`,
    link: `/collab/${collab.id}`,
    metadata: { collabId: collab.id, projectId, dashboardPath: '/builder/proposals' },
  });

  void logBusinessEvent({
    eventType: 'open_project_hired',
    entityType: 'open_project',
    entityId: projectId,
    collabId: collab.id,
    actorId: buyerId,
    amountUsd: proposedAmount,
    summary: `Hired builder for open project "${project.title}"`,
    metadata: { proposal_id: proposalId, builder_id: builderId },
  });

  const { data: draftMilestone } = await supabaseAdmin
    .from('milestones')
    .select('id')
    .eq('collab_id', collab.id)
    .eq('status', 'draft')
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    collabId: collab.id,
    projectRequestId: request.id,
    negotiationId: negotiation.id,
    checkoutUrl: draftMilestone?.id ? `/checkout/escrow/${draftMilestone.id}` : null,
  };
}
