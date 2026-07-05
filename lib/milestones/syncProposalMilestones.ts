import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProposalMilestone } from '@/lib/project-proposals/types';

function mapCollabPaymentType(paymentType: string | null | undefined) {
  return paymentType === 'milestone_payment' ? 'milestone_based' : 'single_payment';
}

export async function syncAcceptedProposalMilestones(
  supabaseAdmin: SupabaseClient,
  collabId: string,
  options?: { force?: boolean }
) {
  const { data: collab, error: collabError } = await supabaseAdmin
    .from('collabs')
    .select('id, project_request_id, escrow_amount_usd, fixed_price_usd, payment_type')
    .eq('id', collabId)
    .single();

  if (collabError || !collab?.project_request_id) {
    return { synced: false as const, reason: 'no_project_request' };
  }

  const { count, error: countError } = await supabaseAdmin
    .from('milestones')
    .select('id', { count: 'exact', head: true })
    .eq('collab_id', collabId);

  if (countError) throw countError;
  if ((count ?? 0) > 0 && !options?.force) {
    return { synced: false as const, reason: 'already_has_milestones' };
  }

  if (options?.force && (count ?? 0) > 0) {
    await supabaseAdmin.from('milestones').delete().eq('collab_id', collabId);
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from('project_requests')
    .select('id, title, description, payment_type, expected_deadline, agreed_amount_usd, budget_usd, accepted_negotiation_id, status')
    .eq('id', collab.project_request_id)
    .single();

  if (requestError || !request) {
    return { synced: false as const, reason: 'request_not_found' };
  }

  let negotiation = null;
  if (request.accepted_negotiation_id) {
    const { data } = await supabaseAdmin
      .from('negotiation_history')
      .select('proposed_amount_usd, proposed_milestones')
      .eq('id', request.accepted_negotiation_id)
      .maybeSingle();
    negotiation = data;
  } else {
    const { data } = await supabaseAdmin
      .from('negotiation_history')
      .select('proposed_amount_usd, proposed_milestones')
      .eq('project_request_id', request.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    negotiation = data;
  }

  const proposedMilestones = (negotiation?.proposed_milestones ?? []) as ProposalMilestone[];
  const agreedAmount = Number(
    negotiation?.proposed_amount_usd ?? request.agreed_amount_usd ?? request.budget_usd ?? 0
  );
  const collabPaymentType = mapCollabPaymentType(request.payment_type);

  const rows =
    collabPaymentType === 'milestone_based' && proposedMilestones.length > 0
      ? proposedMilestones.map((milestone, index) => ({
          collab_id: collabId,
          title: milestone.title || `Milestone ${index + 1}`,
          description: milestone.description || '',
          deliverables: milestone.description || milestone.title || '',
          amount_usd: Number(milestone.amount || 0),
          due_date: milestone.deadline || request.expected_deadline,
          status: 'draft',
          order_index: index,
          is_new_milestone: false,
        }))
      : [
          {
            collab_id: collabId,
            title: 'Project Completion',
            description: request.description,
            deliverables: request.description,
            amount_usd: agreedAmount,
            due_date: request.expected_deadline,
            status: 'draft',
            order_index: 0,
            is_new_milestone: false,
          },
        ];

  const { error: insertError } = await supabaseAdmin.from('milestones').insert(rows);
  if (insertError) throw insertError;

  await supabaseAdmin
    .from('collabs')
    .update({
      payment_type: collabPaymentType,
      escrow_amount_usd: agreedAmount,
      fixed_price_usd: agreedAmount,
    })
    .eq('id', collabId);

  return {
    synced: true as const,
    milestoneCount: rows.length,
    agreedAmount,
    paymentType: collabPaymentType,
  };
}
