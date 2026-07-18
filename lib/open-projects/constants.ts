export const ACTIVE_PROPOSAL_STATUSES = [
  'submitted',
  'pending',
  'shortlisted',
  'negotiating',
] as const;

export const INACTIVE_PROPOSAL_STATUSES = [
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
  'cancelled',
] as const;

export const ACTIVE_BUYER_PROJECT_STATUSES = [
  'published',
  'receiving_proposals',
  'negotiating',
] as const;

export const BUILDER_MAX_DAILY_PROPOSALS = 5;
export const BUILDER_MAX_ACTIVE_PROPOSALS = 5;
export const BUILDER_MAX_DAILY_WITHDRAWALS = 3;
export const BUILDER_MAX_EDITS_AFTER_VIEW = 3;
