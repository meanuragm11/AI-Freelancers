export const GEMINI_MODEL = 'gemini-2.5-flash';

export const MODERATION_THRESHOLDS = {
  /** Risk score at or above this triggers a flag for founder review */
  flag: 60,
  /** Risk score at or above this auto-blocks content pending review */
  block: 85,
  /** Minimum confidence required to auto-block */
  blockMinConfidence: 70,
} as const;

export const GEMINI_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 500,
} as const;

export const ESCALATION = {
  warningOffences: 1,
  restrictionOffences: 2,
  suspensionOffences: 3,
  banOffences: 4,
  restrictionHours: 24,
  suspensionDays: 7,
} as const;

export const TRUST_SCORE = {
  initial: 100,
  warningPenalty: 5,
  flagPenalty: 10,
  blockPenalty: 20,
  min: 0,
  max: 100,
} as const;

export const PROJECT_DOMAIN_MODERATION = {
  /** Shown to buyers when a project is queued for founder AI-domain review */
  founderReviewUserMessage:
    "Your project is under review to verify that it aligns with Zelance's AI marketplace guidelines. We'll notify you once the review is complete.",
  /** Shown when a project is rejected for policy violations */
  rejectedUserMessage:
    'Your project could not be published because it violates Zelance marketplace policies. Please revise your listing and try again.',
} as const;
