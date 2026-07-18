import type { SupabaseClient } from '@supabase/supabase-js';
import { BUILDER_MAX_EDITS_AFTER_VIEW } from './constants';
import { logMarketplaceAudit } from './limits';

export type ProposalEditCheck = {
  canEdit: boolean;
  editCount: number;
  maxEdits: number | null;
  remainingEdits: number | null;
  firstViewed: boolean;
  reason?: string;
};

export type UpdateProposalContentInput = {
  cover_letter?: string;
  proposed_amount_usd?: number;
  proposed_duration_days?: number | null;
  payment_type?: 'single_payment' | 'milestone_payment';
  proposed_milestones?: unknown[];
  attachments?: Array<{ file_url: string; file_name: string; file_type?: string }>;
};

export function checkProposalEditEligibility(proposal: {
  first_viewed_at?: string | null;
  edit_count?: number;
  status: string;
}): ProposalEditCheck {
  const editCount = proposal.edit_count ?? 0;
  const firstViewed = Boolean(proposal.first_viewed_at);
  const inactiveStatuses = ['accepted', 'rejected', 'withdrawn', 'expired', 'cancelled'];

  if (inactiveStatuses.includes(proposal.status)) {
    return {
      canEdit: false,
      editCount,
      maxEdits: null,
      remainingEdits: null,
      firstViewed,
      reason: 'This proposal can no longer be edited.',
    };
  }

  if (!firstViewed) {
    return {
      canEdit: true,
      editCount,
      maxEdits: null,
      remainingEdits: null,
      firstViewed: false,
    };
  }

  const remaining = BUILDER_MAX_EDITS_AFTER_VIEW - editCount;
  if (remaining <= 0) {
    return {
      canEdit: false,
      editCount,
      maxEdits: BUILDER_MAX_EDITS_AFTER_VIEW,
      remainingEdits: 0,
      firstViewed: true,
      reason: 'You have used all 3 edits after the buyer viewed your proposal.',
    };
  }

  return {
    canEdit: true,
    editCount,
    maxEdits: BUILDER_MAX_EDITS_AFTER_VIEW,
    remainingEdits: remaining,
    firstViewed: true,
  };
}

export async function markProposalViewedByBuyer(
  supabase: SupabaseClient,
  proposalId: string,
  buyerId: string
): Promise<void> {
  const { data: proposal } = await supabase
    .from('project_proposals')
    .select('id, first_viewed_at, project_id, project:projects!inner(buyer_id)')
    .eq('id', proposalId)
    .maybeSingle();

  if (!proposal) return;
  const project = proposal.project as unknown as { buyer_id: string };
  if (project.buyer_id !== buyerId) return;
  if (proposal.first_viewed_at) return;

  await supabase
    .from('project_proposals')
    .update({ first_viewed_at: new Date().toISOString() })
    .eq('id', proposalId);

  await logMarketplaceAudit(supabase, {
    entity_type: 'proposal',
    entity_id: proposalId,
    action: 'buyer_first_view',
    actor_id: buyerId,
    metadata: { project_id: proposal.project_id },
  });
}

export async function updateProposalContent(
  supabase: SupabaseClient,
  proposalId: string,
  builderId: string,
  input: UpdateProposalContentInput
) {
  const { data: existing, error: fetchError } = await supabase
    .from('project_proposals')
    .select('*, attachments:proposal_attachments(id, file_url, file_name, file_type)')
    .eq('id', proposalId)
    .eq('builder_id', builderId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !existing) throw new Error('Proposal not found');

  const eligibility = checkProposalEditEligibility(existing);
  if (!eligibility.canEdit) throw new Error(eligibility.reason ?? 'Cannot edit proposal');

  const nextVersion = (existing.current_version ?? 1) + 1;
  const snapshotAttachments =
    existing.attachments?.map((a: { file_url: string; file_name: string; file_type?: string }) => ({
      file_url: a.file_url,
      file_name: a.file_name,
      file_type: a.file_type ?? null,
    })) ?? [];

  await supabase.from('proposal_versions').insert({
    proposal_id: proposalId,
    version_number: existing.current_version ?? 1,
    cover_letter: existing.cover_letter,
    proposed_amount_usd: existing.proposed_amount_usd,
    proposed_duration_days: existing.proposed_duration_days,
    payment_type: existing.payment_type,
    proposed_milestones: existing.proposed_milestones ?? [],
    attachments: snapshotAttachments,
    edited_by: builderId,
  });

  const updates: Record<string, unknown> = {
    edit_count: (existing.edit_count ?? 0) + 1,
    current_version: nextVersion,
  };

  if (input.cover_letter !== undefined) updates.cover_letter = input.cover_letter.trim();
  if (input.proposed_amount_usd !== undefined) updates.proposed_amount_usd = input.proposed_amount_usd;
  if (input.proposed_duration_days !== undefined) {
    updates.proposed_duration_days = input.proposed_duration_days;
  }
  if (input.payment_type !== undefined) updates.payment_type = input.payment_type;
  if (input.proposed_milestones !== undefined) updates.proposed_milestones = input.proposed_milestones;

  const { data: proposal, error } = await supabase
    .from('project_proposals')
    .update(updates)
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;

  if (input.attachments) {
    await supabase.from('proposal_attachments').delete().eq('proposal_id', proposalId);
    if (input.attachments.length) {
      await supabase.from('proposal_attachments').insert(
        input.attachments.map((a) => ({
          proposal_id: proposalId,
          file_url: a.file_url,
          file_name: a.file_name,
          file_type: a.file_type ?? null,
        }))
      );
    }
  }

  await logMarketplaceAudit(supabase, {
    entity_type: 'proposal',
    entity_id: proposalId,
    action: 'content_updated',
    actor_id: builderId,
    metadata: { version: nextVersion, edit_count: (existing.edit_count ?? 0) + 1 },
  });

  return proposal;
}

export async function withdrawProposal(
  supabase: SupabaseClient,
  proposalId: string,
  builderId: string
) {
  const { data: existing } = await supabase
    .from('project_proposals')
    .select('id, status, project_id')
    .eq('id', proposalId)
    .eq('builder_id', builderId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) throw new Error('Proposal not found');
  if (existing.status === 'withdrawn') throw new Error('Proposal is already withdrawn');

  const inactive = ['accepted', 'rejected', 'withdrawn', 'expired', 'cancelled'];
  if (inactive.includes(existing.status)) {
    throw new Error('This proposal cannot be withdrawn');
  }

  const { data: proposal, error } = await supabase
    .from('project_proposals')
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('proposal_status_history').insert({
    proposal_id: proposalId,
    old_status: existing.status,
    new_status: 'withdrawn',
    changed_by: builderId,
    note: 'Withdrawn by builder',
  });

  await logMarketplaceAudit(supabase, {
    entity_type: 'proposal',
    entity_id: proposalId,
    action: 'withdrawn',
    actor_id: builderId,
    metadata: { project_id: existing.project_id },
  });

  return proposal;
}
