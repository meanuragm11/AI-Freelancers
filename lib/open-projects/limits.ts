import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseAdminClient } from '@/lib/server/supabase';

import {

  ACTIVE_BUYER_PROJECT_STATUSES,

  ACTIVE_PROPOSAL_STATUSES,

  BUILDER_MAX_ACTIVE_PROPOSALS,

  BUILDER_MAX_DAILY_PROPOSALS,

  BUILDER_MAX_DAILY_WITHDRAWALS,

} from './constants';

import {

  checkBuyerPublishingLimits,

  countActivePublicProjects,

  type BuyerPublishingLimitCheck,

} from './buyerRestrictions';



export type BuilderLimitCheck = {

  canSubmit: boolean;

  activeCount: number;

  activeLimit: number;

  dailyCount: number;

  dailyLimit: number;

  dailyLimitReached: boolean;

  activeLimitReached: boolean;

  reason?: string;

};



export type BuyerLimitCheck = BuyerPublishingLimitCheck & {

  activeCount: number;

  activeLimit: number | null;

};



export type WithdrawalLimitCheck = {

  canWithdraw: boolean;

  dailyCount: number;

  dailyLimit: number;

  reason?: string;

};



function todayUtc(): string {

  return new Date().toISOString().slice(0, 10);

}



export async function logMarketplaceAudit(

  _supabase: SupabaseClient,

  entry: {

    entity_type: 'project' | 'proposal' | 'buyer' | 'builder';

    entity_id: string;

    action: string;

    actor_id?: string | null;

    metadata?: Record<string, unknown>;

  }

): Promise<void> {

  const admin = createSupabaseAdminClient();

  await admin.from('marketplace_audit_logs').insert({

    entity_type: entry.entity_type,

    entity_id: entry.entity_id,

    action: entry.action,

    actor_id: entry.actor_id ?? null,

    metadata: entry.metadata ?? {},

  });

}



export async function getBuilderDailyActivity(

  supabase: SupabaseClient,

  builderId: string,

  activityDate = todayUtc()

) {

  const { data } = await supabase

    .from('builder_daily_activity')

    .select('proposals_submitted, proposals_withdrawn')

    .eq('builder_id', builderId)

    .eq('activity_date', activityDate)

    .maybeSingle();



  return {

    proposalsSubmitted: data?.proposals_submitted ?? 0,

    proposalsWithdrawn: data?.proposals_withdrawn ?? 0,

  };

}



export async function incrementBuilderDailyCounter(

  _supabase: SupabaseClient,

  builderId: string,

  field: 'proposals_submitted' | 'proposals_withdrawn'

): Promise<void> {

  const admin = createSupabaseAdminClient();

  const activityDate = todayUtc();

  const { data: existing } = await admin

    .from('builder_daily_activity')

    .select('proposals_submitted, proposals_withdrawn')

    .eq('builder_id', builderId)

    .eq('activity_date', activityDate)

    .maybeSingle();



  if (existing) {

    const updates =

      field === 'proposals_submitted'

        ? { proposals_submitted: (existing.proposals_submitted ?? 0) + 1 }

        : { proposals_withdrawn: (existing.proposals_withdrawn ?? 0) + 1 };



    await admin

      .from('builder_daily_activity')

      .update(updates)

      .eq('builder_id', builderId)

      .eq('activity_date', activityDate);

    return;

  }



  await admin.from('builder_daily_activity').insert({

    builder_id: builderId,

    activity_date: activityDate,

    proposals_submitted: field === 'proposals_submitted' ? 1 : 0,

    proposals_withdrawn: field === 'proposals_withdrawn' ? 1 : 0,

  });

}



export async function countBuilderActiveProposals(

  supabase: SupabaseClient,

  builderId: string

): Promise<number> {

  const { count } = await supabase

    .from('project_proposals')

    .select('id', { count: 'exact', head: true })

    .eq('builder_id', builderId)

    .is('deleted_at', null)

    .in('status', [...ACTIVE_PROPOSAL_STATUSES]);



  return count ?? 0;

}



export async function checkBuilderProposalLimits(

  supabase: SupabaseClient,

  builderId: string

): Promise<BuilderLimitCheck> {

  const [activeCount, daily] = await Promise.all([

    countBuilderActiveProposals(supabase, builderId),

    getBuilderDailyActivity(supabase, builderId),

  ]);



  const activeLimitReached = activeCount >= BUILDER_MAX_ACTIVE_PROPOSALS;

  const dailyLimitReached = daily.proposalsSubmitted >= BUILDER_MAX_DAILY_PROPOSALS;



  let reason: string | undefined;

  if (dailyLimitReached) {

    reason = "You've reached today's proposal limit. Please try again tomorrow.";

  } else if (activeLimitReached) {

    reason =

      'You have reached the maximum of 5 active proposals. Withdraw or wait for responses before submitting more.';

  }



  return {

    canSubmit: !dailyLimitReached && !activeLimitReached,

    activeCount,

    activeLimit: BUILDER_MAX_ACTIVE_PROPOSALS,

    dailyCount: daily.proposalsSubmitted,

    dailyLimit: BUILDER_MAX_DAILY_PROPOSALS,

    dailyLimitReached,

    activeLimitReached,

    reason,

  };

}



export async function countBuyerActiveProjects(

  supabase: SupabaseClient,

  buyerId: string,

  excludeProjectId?: string

): Promise<number> {

  return countActivePublicProjects(supabase, buyerId, excludeProjectId);

}



export async function checkBuyerProjectLimits(

  supabase: SupabaseClient,

  buyerId: string,

  excludeProjectId?: string

): Promise<BuyerLimitCheck> {

  const limits = await checkBuyerPublishingLimits(supabase, buyerId, excludeProjectId);

  return {

    ...limits,

    activeCount: limits.activePublicCount,

    activeLimit: limits.activePublicLimit,

  };

}



export async function checkWithdrawalLimits(

  supabase: SupabaseClient,

  builderId: string

): Promise<WithdrawalLimitCheck> {

  const daily = await getBuilderDailyActivity(supabase, builderId);

  const limitReached = daily.proposalsWithdrawn >= BUILDER_MAX_DAILY_WITHDRAWALS;



  return {

    canWithdraw: !limitReached,

    dailyCount: daily.proposalsWithdrawn,

    dailyLimit: BUILDER_MAX_DAILY_WITHDRAWALS,

    reason: limitReached

      ? "You've reached today's withdrawal limit (3). Please try again tomorrow."

      : undefined,

  };

}



export { checkBuyerPublishingLimits };


