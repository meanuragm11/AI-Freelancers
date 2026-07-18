export type ModerationEntityType = 'project' | 'proposal' | 'chat' | 'user';

export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'blocked' | 'reviewed';

export type ModerationCategory =
  | 'spam'
  | 'contact_sharing'
  | 'external_payment'
  | 'off_platform'
  | 'harassment'
  | 'hate_speech'
  | 'scam'
  | 'illegal'
  | 'offensive'
  | 'low_quality'
  | 'duplicate'
  | 'fake_job'
  | 'copy_paste'
  | 'unrealistic'
  | 'suspicious'
  | 'fraud'
  | 'threat'
  | 'safe'
  | 'unknown';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AiModerationResult = {
  riskScore: number;
  confidenceScore: number;
  category: ModerationCategory;
  reason: string;
  riskLevel?: RiskLevel;
  shouldFlag: boolean;
  shouldBlock: boolean;
  rawResponse?: Record<string, unknown>;
  geminiFailed?: boolean;
  regexOnly?: boolean;
};

export type ProjectModerationInput = {
  projectId: string;
  buyerId: string;
  title: string;
  description: string;
  category?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
};

export type ProposalModerationInput = {
  proposalId: string;
  builderId: string;
  coverLetter: string;
  proposedAmountUsd: number;
  projectTitle?: string;
};

export type ChatModerationInput = {
  messageId: string;
  collabId: string;
  senderId: string;
  content: string;
};

export type FounderModerationAction =
  | 'warn'
  | 'suspend'
  | 'ban'
  | 'remove_content'
  | 'restore_content'
  | 'approve'
  | 'dismiss';

export type EscalationLevel = 'warning' | '24h_restriction' | '7d_suspension' | 'permanent_ban';

/** Gemini AI domain classification for open project postings */
export type ProjectDomainClassification = 'AI_PROJECT' | 'NON_AI_PROJECT' | 'AMBIGUOUS_PROJECT';

/** Gemini recommended action — backend applies final publish/hide/review/reject decision */
export type ModerationRecommendedAction = 'PUBLISH' | 'FOUNDER_REVIEW' | 'REJECT';

export type ProjectModerationResult = {
  safe: boolean;
  domain: ProjectDomainClassification;
  confidence: number;
  reason: string;
  recommendedAction: ModerationRecommendedAction;
  riskScore: number;
  confidenceScore: number;
  category: ModerationCategory;
  shouldFlag: boolean;
  shouldBlock: boolean;
  rawResponse?: Record<string, unknown>;
  geminiFailed?: boolean;
};

export type ProjectModerationOutcome = {
  visibility: 'published' | 'hidden' | 'rejected';
  moderationStatus: ModerationStatus;
  domain?: ProjectDomainClassification;
  recommendedAction?: ModerationRecommendedAction;
  /** Neutral user-facing copy when the project is sent to founder review */
  userMessage?: string;
  pendingFounderReview: boolean;
};
