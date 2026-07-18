import type { SupabaseClient } from '@supabase/supabase-js';
import { ARENA_PILLAR_WEIGHTS } from './pillars';
import {
  clampDailyActivity,
  dampenRepeatedEdits,
  sanitizeTrafficSignal,
} from './antiGaming';
import type { ArenaPillarId } from './types';

export type BuilderArenaSignals = {
  builderId: string;
  fullName: string;
  headline: string;
  avatarUrl?: string;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  completedProjects: number;
  profileViews: number;
  lastActiveAt: string | null;
  averageResponseHours: number | null;
  techStackCount: number;
  hasAvatar: boolean;
  hasBio: boolean;
  hasHeadline: boolean;
  hasBanner: boolean;
  publishedSolutions: number;
  solutionSales: number;
  portfolioCount: number;
  completedCollabs: number;
  cancelledCollabs: number;
  disputedCollabs: number;
  repeatBuyerCount: number;
  totalEarningsUsd: number;
  moderationStrikes: number;
  profileAgeDays: number;
  recentProfileEdits: number;
  achievedMilestones: Set<string>;
};

type PillarScores = Record<ArenaPillarId, number>;

function clampScore(value: number, max = 100): number {
  return Math.max(0, Math.min(max, value));
}

function computeTrustScore(signals: BuilderArenaSignals): number {
  let score = 0;

  if (signals.reviewCount > 0) {
    score += (signals.averageRating / 5) * 35;
    score += Math.min(15, Math.log10(signals.reviewCount + 1) * 8);
  }

  score += Math.min(20, signals.completedCollabs * 4);
  score += Math.min(10, signals.repeatBuyerCount * 3);

  if (signals.isVerified) score += 10;

  score -= Math.min(25, signals.cancelledCollabs * 5);
  score -= Math.min(30, signals.disputedCollabs * 10);
  score -= Math.min(40, signals.moderationStrikes * 15);

  if (signals.averageResponseHours != null && signals.averageResponseHours <= 24) {
    score += 5;
  }

  return clampScore(score);
}

function computeExpertiseScore(signals: BuilderArenaSignals): number {
  let score = 0;

  if (signals.hasHeadline) score += 8;
  if (signals.hasBio) score += 10;
  if (signals.hasAvatar) score += 6;
  if (signals.hasBanner) score += 4;
  score += Math.min(15, signals.techStackCount * 3);
  score += Math.min(20, signals.portfolioCount * 5);
  score += Math.min(25, signals.publishedSolutions * 5);
  score += Math.min(12, signals.completedProjects * 2);

  return clampScore(score);
}

function computeActivityScore(signals: BuilderArenaSignals): number {
  let score = 0;

  if (signals.lastActiveAt) {
    const daysSinceActive =
      (Date.now() - new Date(signals.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive <= 1) score += 25;
    else if (daysSinceActive <= 7) score += 18;
    else if (daysSinceActive <= 30) score += 10;
    else if (daysSinceActive <= 90) score += 4;
  }

  score += Math.min(20, signals.publishedSolutions * 4);

  const editSignal = dampenRepeatedEdits(
    clampDailyActivity(signals.recentProfileEdits, 'profile_updated')
  );
  score += Math.min(8, editSignal * 3);

  if (signals.averageResponseHours != null) {
    if (signals.averageResponseHours <= 4) score += 15;
    else if (signals.averageResponseHours <= 12) score += 10;
    else if (signals.averageResponseHours <= 48) score += 5;
  }

  return clampScore(score);
}

function computeCommunityScore(signals: BuilderArenaSignals): number {
  const sanitizedViews = sanitizeTrafficSignal(signals.profileViews, signals.profileAgeDays);
  let score = Math.min(40, Math.log10(sanitizedViews + 1) * 12);
  score += Math.min(20, signals.solutionSales * 0.5);
  score += Math.min(15, signals.repeatBuyerCount * 4);

  if (signals.achievedMilestones.has('profile_shared')) score += 10;

  return clampScore(score);
}

function computeGrowthScore(signals: BuilderArenaSignals): number {
  let score = 0;

  const milestonePoints: Record<string, number> = {
    first_solution: 15,
    first_review: 12,
    first_project: 18,
    profile_complete: 10,
    revenue_100: 8,
    revenue_1000: 12,
    verified_builder: 15,
  };

  for (const [key, points] of Object.entries(milestonePoints)) {
    if (signals.achievedMilestones.has(key)) score += points;
  }

  if (signals.totalEarningsUsd >= 1000) score += 10;
  else if (signals.totalEarningsUsd >= 100) score += 5;

  const profileFields = [signals.hasHeadline, signals.hasBio, signals.hasAvatar, signals.techStackCount > 0];
  const completionRatio = profileFields.filter(Boolean).length / profileFields.length;
  score += completionRatio * 15;

  return clampScore(score);
}

export function computePillarScores(signals: BuilderArenaSignals): PillarScores {
  return {
    trust: computeTrustScore(signals),
    expertise: computeExpertiseScore(signals),
    activity: computeActivityScore(signals),
    community: computeCommunityScore(signals),
    growth: computeGrowthScore(signals),
  };
}

export async function gatherBuilderSignals(
  supabaseAdmin: SupabaseClient,
  builderId: string
): Promise<BuilderArenaSignals | null> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select(
      'id, full_name, headline, avatar_url, banner_url, bio, tech_stack, is_verified, average_rating, review_count, completed_projects, profile_views, last_active_at, average_response_hours, total_earnings_usd, created_at'
    )
    .eq('id', builderId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return null;

  const [
    servicesRes,
    portfolioRes,
    collabsRes,
    milestonesRes,
    eventsRes,
    moderationRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('services')
      .select('id, sales_count, status')
      .eq('builder_id', builderId),
    supabaseAdmin.from('portfolio_projects').select('id').eq('builder_id', builderId),
    supabaseAdmin
      .from('collabs')
      .select('id, status, buyer_id')
      .eq('builder_id', builderId),
    supabaseAdmin
      .from('arena_milestones')
      .select('milestone_key')
      .eq('builder_id', builderId),
    supabaseAdmin
      .from('arena_events')
      .select('event_type, created_at')
      .eq('builder_id', builderId)
      .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
    supabaseAdmin
      .from('moderation_logs')
      .select('id')
      .eq('user_id', builderId)
      .in('status', ['actioned', 'confirmed']),
  ]);

  if (servicesRes.error) throw servicesRes.error;
  if (portfolioRes.error) throw portfolioRes.error;
  if (collabsRes.error) throw collabsRes.error;

  const services = servicesRes.data ?? [];
  const publishedSolutions = services.filter((s) => s.status === 'published').length;
  const solutionSales = services.reduce((sum, s) => sum + Number(s.sales_count ?? 0), 0);

  const collabs = collabsRes.data ?? [];
  const completedCollabs = collabs.filter((c) =>
    ['completed', 'approved'].includes((c.status ?? '').toLowerCase())
  ).length;
  const cancelledCollabs = collabs.filter((c) =>
    ['cancelled', 'canceled', 'rejected'].includes((c.status ?? '').toLowerCase())
  ).length;
  const disputedCollabs = collabs.filter((c) => (c.status ?? '').toLowerCase() === 'disputed').length;

  const buyerCounts = new Map<string, number>();
  for (const collab of collabs) {
    if (!collab.buyer_id) continue;
    buyerCounts.set(collab.buyer_id, (buyerCounts.get(collab.buyer_id) ?? 0) + 1);
  }
  const repeatBuyerCount = Array.from(buyerCounts.values()).filter((c) => c > 1).length;

  const techStack = Array.isArray(profile.tech_stack) ? profile.tech_stack : [];
  const profileCreated = profile.created_at ? new Date(profile.created_at) : new Date();
  const profileAgeDays = Math.max(
    1,
    (Date.now() - profileCreated.getTime()) / (1000 * 60 * 60 * 24)
  );

  const recentProfileEdits =
    (!eventsRes.error ? eventsRes.data : [])?.filter((e) => e.event_type === 'profile_updated')
      .length ?? 0;

  const achievedMilestones = new Set(
    (!milestonesRes.error ? milestonesRes.data : [])?.map((m) => m.milestone_key as string) ?? []
  );

  return {
    builderId,
    fullName: profile.full_name ?? 'Expert',
    headline: profile.headline ?? 'AI Builder',
    avatarUrl: profile.avatar_url ?? undefined,
    isVerified: Boolean(profile.is_verified),
    averageRating: Number(profile.average_rating ?? 0),
    reviewCount: Number(profile.review_count ?? 0),
    completedProjects: Number(profile.completed_projects ?? 0),
    profileViews: Number(profile.profile_views ?? 0),
    lastActiveAt: profile.last_active_at ?? null,
    averageResponseHours: profile.average_response_hours ?? null,
    techStackCount: techStack.length,
    hasAvatar: Boolean(profile.avatar_url),
    hasBio: Boolean(profile.bio?.trim()),
    hasHeadline: Boolean(profile.headline?.trim()),
    hasBanner: Boolean(profile.banner_url),
    publishedSolutions,
    solutionSales,
    portfolioCount: portfolioRes.data?.length ?? 0,
    completedCollabs,
    cancelledCollabs,
    disputedCollabs,
    repeatBuyerCount,
    totalEarningsUsd: Number(profile.total_earnings_usd ?? 0),
    moderationStrikes: moderationRes.error ? 0 : (moderationRes.data?.length ?? 0),
    profileAgeDays,
    recentProfileEdits,
    achievedMilestones,
  };
}

