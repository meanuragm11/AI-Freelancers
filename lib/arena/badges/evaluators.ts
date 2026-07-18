import { clampDailyActivity, dampenRepeatedEdits, sanitizeTrafficSignal } from '../antiGaming';
import type { BuilderArenaSignals } from '../calculator';

export type BadgeMomentumSignals = {
  recentProfileViews: number;
  priorProfileViews: number;
  recentInvitations: number;
  priorInvitations: number;
  recentReviews: number;
  recentActivityEvents: number;
  totalServiceViews: number;
  savedExpertCount: number;
  recentProposalAcceptances: number;
};

export type BadgeEvaluationContext = {
  signals: BuilderArenaSignals;
  momentum: BadgeMomentumSignals;
  editorsPick: boolean;
};

function completionRate(signals: BuilderArenaSignals): number {
  const total =
    signals.completedCollabs + signals.cancelledCollabs + signals.disputedCollabs;
  if (total === 0) return 0;
  return signals.completedCollabs / total;
}

export function evaluateTrusted(ctx: BadgeEvaluationContext): boolean {
  const { signals } = ctx;
  const rate = completionRate(signals);

  return (
    signals.isVerified &&
    signals.profileAgeDays >= 60 &&
    signals.completedCollabs >= 2 &&
    rate >= 0.85 &&
    signals.disputedCollabs === 0 &&
    signals.moderationStrikes === 0 &&
    (signals.reviewCount === 0 || signals.averageRating >= 4.3)
  );
}

export function evaluateRising(ctx: BadgeEvaluationContext): boolean {
  const { signals, momentum } = ctx;

  const viewGrowth =
    momentum.priorProfileViews > 0
      ? momentum.recentProfileViews / Math.max(1, momentum.priorProfileViews)
      : momentum.recentProfileViews >= 5
        ? 2
        : 0;

  const invitationGrowth =
    momentum.recentInvitations >= 2 ||
    (momentum.priorInvitations > 0 &&
      momentum.recentInvitations > momentum.priorInvitations);

  const recentActivity =
    momentum.recentActivityEvents >= 3 ||
    momentum.recentReviews >= 1 ||
    momentum.recentProposalAcceptances >= 1;

  const editSignal = dampenRepeatedEdits(
    clampDailyActivity(signals.recentProfileEdits, 'profile_updated')
  );

  return (
    signals.publishedSolutions >= 1 &&
    signals.lastActiveAt != null &&
    (viewGrowth >= 1.25 || invitationGrowth || recentActivity) &&
    editSignal <= 2
  );
}

export function evaluateFastResponder(ctx: BadgeEvaluationContext): boolean {
  const { signals } = ctx;

  if (signals.averageResponseHours == null) return false;
  if (signals.completedCollabs < 1 && signals.reviewCount < 1) return false;

  return signals.averageResponseHours <= 6;
}

export function evaluateInDemand(ctx: BadgeEvaluationContext): boolean {
  const { signals, momentum } = ctx;

  const sanitizedViews = sanitizeTrafficSignal(
    signals.profileViews,
    signals.profileAgeDays
  );

  const engagementScore =
    sanitizedViews * 0.4 +
    momentum.totalServiceViews * 0.3 +
    momentum.savedExpertCount * 5 +
    momentum.recentInvitations * 8 +
    signals.solutionSales * 4;

  const recentEngagement =
    momentum.recentProfileViews >= 10 ||
    momentum.recentInvitations >= 2 ||
    momentum.savedExpertCount >= 3;

  return engagementScore >= 40 || recentEngagement;
}

export function evaluateEditorsPick(ctx: BadgeEvaluationContext): boolean {
  return ctx.editorsPick;
}

export function evaluateAllBadges(
  ctx: BadgeEvaluationContext
): Array<'trusted' | 'rising' | 'fast_responder' | 'in_demand' | 'editors_pick'> {
  const earned: Array<'trusted' | 'rising' | 'fast_responder' | 'in_demand' | 'editors_pick'> =
    [];

  if (evaluateEditorsPick(ctx)) earned.push('editors_pick');
  if (evaluateTrusted(ctx)) earned.push('trusted');
  if (evaluateInDemand(ctx)) earned.push('in_demand');
  if (evaluateRising(ctx)) earned.push('rising');
  if (evaluateFastResponder(ctx)) earned.push('fast_responder');

  return earned;
}
