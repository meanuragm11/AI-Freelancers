import type { SupabaseClient } from '@supabase/supabase-js';

export const ORIGINAL_MILESTONE_PLATFORM_FEE_USD = 5;
export const NEW_MILESTONE_FEE_THRESHOLD_USD = 50;
export const NEW_MILESTONE_PLATFORM_FEE_USD = 5;

/** Flat platform fee deducted from an open-project proposal bid (escrow original milestone). */
export function calculateOpenProposalPlatformFee(proposedAmountUsd: number): number {
  if (proposedAmountUsd <= 0) return 0;
  return ORIGINAL_MILESTONE_PLATFORM_FEE_USD;
}

export function builderNetAfterOpenProposalFee(proposedAmountUsd: number): number {
  return Math.max(0, proposedAmountUsd - calculateOpenProposalPlatformFee(proposedAmountUsd));
}

const FUNDED_MILESTONE_STATUSES = [
  'funded',
  'in_progress',
  'submitted',
  'approved',
  'released',
  'completed',
] as const;

type MilestoneFeeInput = {
  id: string;
  collab_id: string;
  amount_usd: number | null;
  is_new_milestone?: boolean | null;
};

type CollabFeeInput = {
  proposal_platform_fee_charged?: boolean | null;
  cumulative_new_milestones_fee_charged?: boolean | null;
};

export async function sumFundedNewMilestoneAmount(
  supabaseAdmin: SupabaseClient,
  collabId: string,
  excludeMilestoneId?: string
) {
  let query = supabaseAdmin
    .from('milestones')
    .select('amount_usd')
    .eq('collab_id', collabId)
    .eq('is_new_milestone', true)
    .in('status', [...FUNDED_MILESTONE_STATUSES]);

  if (excludeMilestoneId) {
    query = query.neq('id', excludeMilestoneId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).reduce((sum, row) => sum + Number(row.amount_usd ?? 0), 0);
}

export async function calculateEscrowMilestonePlatformFee(
  supabaseAdmin: SupabaseClient,
  milestone: MilestoneFeeInput,
  collab: CollabFeeInput
) {
  if (milestone.is_new_milestone) {
    if (collab.cumulative_new_milestones_fee_charged) return 0;

    const alreadyFundedNewTotal = await sumFundedNewMilestoneAmount(
      supabaseAdmin,
      milestone.collab_id,
      milestone.id
    );
    const projectedAtPayment = alreadyFundedNewTotal + Number(milestone.amount_usd ?? 0);

    if (projectedAtPayment >= NEW_MILESTONE_FEE_THRESHOLD_USD) {
      return NEW_MILESTONE_PLATFORM_FEE_USD;
    }
    return 0;
  }

  if (collab.proposal_platform_fee_charged) return 0;
  return ORIGINAL_MILESTONE_PLATFORM_FEE_USD;
}

export async function areAllOriginalMilestonesFunded(
  supabaseAdmin: SupabaseClient,
  collabId: string
) {
  const { data, error } = await supabaseAdmin
    .from('milestones')
    .select('status')
    .eq('collab_id', collabId)
    .eq('is_new_milestone', false);

  if (error) throw error;
  if (!data || data.length === 0) return false;

  return data.every((row) => FUNDED_MILESTONE_STATUSES.includes(row.status as (typeof FUNDED_MILESTONE_STATUSES)[number]));
}

export async function collabHasAnyFundedMilestone(
  supabaseAdmin: SupabaseClient,
  collabId: string
) {
  const { count, error } = await supabaseAdmin
    .from('milestones')
    .select('id', { count: 'exact', head: true })
    .eq('collab_id', collabId)
    .in('status', [...FUNDED_MILESTONE_STATUSES]);

  if (error) throw error;
  return (count ?? 0) > 0;
}
