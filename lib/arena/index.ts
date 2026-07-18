export type {
  RecognitionBadgeKey,
  RecognitionBadge,
  RecognitionBadgeGrant,
  NextBadgeHint,
  BuilderRecognitionSnapshot,
} from './badges/types';

export {
  RECOGNITION_BADGES,
  BADGE_PRIORITY,
  getPrimaryBadge,
  sortBadgesByPriority,
} from './badges/types';

export {
  computeBuilderBadges,
  fetchCachedBuilderBadges,
} from './badges/engine';

export {
  fetchBuilderRecognition,
  fetchBuildersRecognitionBatch,
  fetchMyRecognition,
} from './badges/client';

export { recordArenaEvent, recordArenaMilestone } from './fetchArena';
export { onSolutionPublished, onProjectCompleted, onReviewReceived } from './hooks';
export { gatherBuilderSignals, type BuilderArenaSignals } from './calculator';
