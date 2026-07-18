export const HIRING_ACTIVITY_TYPES = [
  'message_proposer',
  'shortlist_proposal',
  'invite_freelancer',
  'start_negotiation',
  'hire',
] as const;

export type HiringActivityType = (typeof HIRING_ACTIVITY_TYPES)[number];

export const MONITORING_WINDOW_DAYS = 7;
export const ACTIVITY_REMINDER_1_HOURS = 72;
export const ACTIVITY_REMINDER_2_HOURS = 144;
export const ACTIVITY_AUTO_ARCHIVE_HOURS = 168;
export const ARCHIVE_RESTORE_WINDOW_DAYS = 90;

export const INACTIVE_BUYER_WINDOW_DAYS = 30;
export const INACTIVE_BUYER_MIN_PUBLISHED = 6;
export const INACTIVE_BUYER_ARCHIVE_RATE_THRESHOLD = 0.6;
export const INACTIVE_BUYER_RELEASE_ARCHIVE_RATE = 0.4;
export const INACTIVE_BUYER_RESTRICTION_DAYS = 30;
export const INACTIVE_BUYER_MAX_PUBLIC_PROJECTS = 3;

export const REPEATED_RESTRICTION_WINDOW_DAYS = 180;
export const REPEATED_RESTRICTION_THRESHOLD = 3;

export const VERIFIED_BUYER_MIN_PAYMENT_USD = 100;
export const VERIFIED_BUYER_MIN_ACCOUNT_DAYS = 30;
export const VERIFIED_BUYER_FRAUD_REVOKE_COUNT = 2;
export const VERIFIED_BUYER_MAJOR_VIOLATION_REVOKE_COUNT = 3;
export const VERIFIED_BUYER_VIOLATION_WINDOW_DAYS = 180;

/** Featured: up to 70% verified, at least 30% new buyers */
export const FEATURED_MAX_VERIFIED_RATIO = 0.7;
export const FEATURED_MIN_NEW_RATIO = 0.3;
/** Browse: up to 40% verified, at least 60% new buyers */
export const BROWSE_MAX_VERIFIED_RATIO = 0.4;
export const BROWSE_MIN_NEW_RATIO = 0.6;

export const MAX_CONSECUTIVE_SAME_BUYER = 2;

export const FEATURED_MAX_AGE_DAYS = 30;
export const FEATURED_ACTIVITY_LOOKBACK_DAYS = 14;

export const MEANINGFUL_MESSAGE_MIN_LENGTH = 20;
export const MEANINGFUL_MESSAGES_REQUIRED = 2;

/** @deprecated use FEATURED_MAX_VERIFIED_RATIO */
export const FEATURED_VERIFIED_RATIO = FEATURED_MAX_VERIFIED_RATIO;
/** @deprecated use BROWSE_MAX_VERIFIED_RATIO */
export const BROWSE_VERIFIED_RATIO = BROWSE_MAX_VERIFIED_RATIO;

/** @deprecated Fixed 3-project cap removed — use inactive-buyer restriction instead */
export const BUYER_MAX_ACTIVE_PROJECTS = INACTIVE_BUYER_MAX_PUBLIC_PROJECTS;

export const ARCHIVE_REASON_INACTIVITY = 'inactivity_no_hiring_actions';

export const QUALITY_SCORE_WEIGHTS = {
  buyerVerification: 0.35,
  recentBuyerActivity: 0.25,
  projectCompleteness: 0.15,
  budgetRealism: 0.1,
  proposalActivity: 0.1,
  projectFreshness: 0.05,
} as const;
