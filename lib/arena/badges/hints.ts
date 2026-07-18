import type { BuilderArenaSignals } from '../calculator';
import {
  evaluateFastResponder,
  evaluateInDemand,
  evaluateRising,
  evaluateTrusted,
  type BadgeEvaluationContext,
} from './evaluators';
import {
  RECOGNITION_BADGES,
  type NextBadgeHint,
  type RecognitionBadgeKey,
} from './types';

const HINT_ORDER: RecognitionBadgeKey[] = [
  'trusted',
  'rising',
  'fast_responder',
  'in_demand',
];

function hintForBadge(
  key: RecognitionBadgeKey,
  signals: BuilderArenaSignals
): string {
  switch (key) {
    case 'trusted':
      if (!signals.isVerified) {
        return 'Get verified and complete more projects with strong reviews to earn Trusted status.';
      }
      if (signals.completedCollabs < 2) {
        return 'Complete a few collaborative projects with happy buyers to build long-term trust.';
      }
      return 'Keep delivering reliably, maintain great reviews, and avoid disputes.';
    case 'rising':
      if (signals.publishedSolutions === 0) {
        return 'Publish an AI Solution and stay active — momentum builds from visibility and engagement.';
      }
      return 'Increase profile views, respond to invitations, and earn recent reviews to show rising momentum.';
    case 'fast_responder':
      if (signals.averageResponseHours == null) {
        return 'Reply quickly to buyer messages — consistent fast responses unlock this badge.';
      }
      return 'Keep your average first response under 6 hours to maintain Fast Responder status.';
    case 'in_demand':
      return 'Drive engagement through profile views, service interest, saves, and buyer inquiries.';
    default:
      return RECOGNITION_BADGES[key].description;
  }
}

export function computeNextBadgeHint(
  ctx: BadgeEvaluationContext,
  earnedKeys: Set<RecognitionBadgeKey>
): NextBadgeHint | null {
  const evaluators: Record<
    Exclude<RecognitionBadgeKey, 'editors_pick'>,
    (ctx: BadgeEvaluationContext) => boolean
  > = {
    trusted: evaluateTrusted,
    rising: evaluateRising,
    fast_responder: evaluateFastResponder,
    in_demand: evaluateInDemand,
  };

  for (const key of HINT_ORDER) {
    if (earnedKeys.has(key)) continue;
    if (evaluators[key as keyof typeof evaluators](ctx)) continue;

    const def = RECOGNITION_BADGES[key];
    return {
      key,
      label: def.label,
      emoji: def.emoji,
      hint: hintForBadge(key, ctx.signals),
    };
  }

  return null;
}
