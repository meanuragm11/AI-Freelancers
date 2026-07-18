/** Recognition badge definitions — no ranks or scores */

export type RecognitionBadgeKey =
  | 'trusted'
  | 'rising'
  | 'fast_responder'
  | 'in_demand'
  | 'editors_pick';

export type RecognitionBadge = {
  key: RecognitionBadgeKey;
  label: string;
  emoji: string;
  description: string;
  auto: boolean;
};

export type RecognitionBadgeGrant = RecognitionBadge & {
  grantedAt: string;
  source: 'auto' | 'admin';
};

export type NextBadgeHint = {
  key: RecognitionBadgeKey;
  label: string;
  emoji: string;
  hint: string;
};

export type BuilderRecognitionSnapshot = {
  builderId: string;
  badges: RecognitionBadgeGrant[];
  primaryBadge: RecognitionBadgeGrant | null;
  nextBadge: NextBadgeHint | null;
};

/** Display priority: Editor's Pick > Trusted > In Demand > Rising > Fast Responder */
export const BADGE_PRIORITY: RecognitionBadgeKey[] = [
  'editors_pick',
  'trusted',
  'in_demand',
  'rising',
  'fast_responder',
];

export const RECOGNITION_BADGES: Record<RecognitionBadgeKey, RecognitionBadge> = {
  trusted: {
    key: 'trusted',
    label: 'Trusted Zelancer',
    emoji: '🏆',
    description: 'Long-term trust built through verified delivery, strong reviews, and low disputes.',
    auto: true,
  },
  rising: {
    key: 'rising',
    label: 'Rising Zelancer',
    emoji: '🚀',
    description: 'Growing momentum — increasing visibility, invitations, and recent positive activity.',
    auto: true,
  },
  fast_responder: {
    key: 'fast_responder',
    label: 'Fast Responder',
    emoji: '⚡',
    description: 'Consistently quick first replies to buyer messages and project inquiries.',
    auto: true,
  },
  in_demand: {
    key: 'in_demand',
    label: 'In Demand',
    emoji: '🔥',
    description: 'High recent engagement — profile views, service interest, saves, and inquiries.',
    auto: true,
  },
  editors_pick: {
    key: 'editors_pick',
    label: "Editor's Pick",
    emoji: '⭐',
    description: 'Hand-selected by the Zelance team for exceptional quality and fit.',
    auto: false,
  },
};

export function getPrimaryBadge(
  badges: RecognitionBadgeGrant[]
): RecognitionBadgeGrant | null {
  for (const key of BADGE_PRIORITY) {
    const match = badges.find((b) => b.key === key);
    if (match) return match;
  }
  return null;
}

export function sortBadgesByPriority(
  badges: RecognitionBadgeGrant[]
): RecognitionBadgeGrant[] {
  return [...badges].sort(
    (a, b) => BADGE_PRIORITY.indexOf(a.key) - BADGE_PRIORITY.indexOf(b.key)
  );
}
