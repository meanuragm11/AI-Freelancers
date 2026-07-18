import type {
  AiModerationResult,
  ModerationCategory,
  ModerationRecommendedAction,
  ProjectDomainClassification,
  ProjectModerationResult,
  RiskLevel,
} from '../types';
import { MODERATION_THRESHOLDS } from '../constants';
import { riskLevelFromScore, riskScoreFromLevel } from '../risk';

const VALID_CATEGORIES = new Set<string>([
  'spam',
  'contact_sharing',
  'external_payment',
  'off_platform',
  'harassment',
  'hate_speech',
  'scam',
  'illegal',
  'offensive',
  'low_quality',
  'duplicate',
  'fake_job',
  'copy_paste',
  'unrealistic',
  'suspicious',
  'fraud',
  'threat',
  'safe',
  'unknown',
]);

const VALID_DOMAINS = new Set<string>(['AI_PROJECT', 'NON_AI_PROJECT', 'AMBIGUOUS_PROJECT']);

const VALID_RECOMMENDED_ACTIONS = new Set<string>(['PUBLISH', 'FOUNDER_REVIEW', 'REJECT']);

const DOMAIN_ALIASES: Record<string, ProjectDomainClassification> = {
  ai_project: 'AI_PROJECT',
  'ai project': 'AI_PROJECT',
  non_ai_project: 'NON_AI_PROJECT',
  'non ai project': 'NON_AI_PROJECT',
  non_ai: 'NON_AI_PROJECT',
  ambiguous_project: 'AMBIGUOUS_PROJECT',
  ambiguous: 'AMBIGUOUS_PROJECT',
};

const ACTION_ALIASES: Record<string, ModerationRecommendedAction> = {
  publish: 'PUBLISH',
  founder_review: 'FOUNDER_REVIEW',
  'founder review': 'FOUNDER_REVIEW',
  reject: 'REJECT',
};

function normalizeDomain(value: unknown): ProjectDomainClassification {
  const str = typeof value === 'string' ? value.toUpperCase().trim().replace(/\s+/g, '_') : '';
  if (DOMAIN_ALIASES[str.toLowerCase()]) return DOMAIN_ALIASES[str.toLowerCase()];
  return VALID_DOMAINS.has(str) ? (str as ProjectDomainClassification) : 'AMBIGUOUS_PROJECT';
}

function normalizeRecommendedAction(value: unknown): ModerationRecommendedAction {
  const str = typeof value === 'string' ? value.toUpperCase().trim().replace(/\s+/g, '_') : '';
  if (ACTION_ALIASES[str.toLowerCase()]) return ACTION_ALIASES[str.toLowerCase()];
  return VALID_RECOMMENDED_ACTIONS.has(str) ? (str as ModerationRecommendedAction) : 'FOUNDER_REVIEW';
}

function normalizeBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

const CHAT_CATEGORY_ALIASES: Record<string, ModerationCategory> = {
  contact_sharing: 'contact_sharing',
  'contact sharing': 'contact_sharing',
  off_platform: 'off_platform',
  'off-platform communication': 'off_platform',
  off_platform_communication: 'off_platform',
  external_payment: 'external_payment',
  'external payment': 'external_payment',
  hate_speech: 'hate_speech',
  'hate speech': 'hate_speech',
};

function clampScore(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeCategory(value: unknown): ModerationCategory {
  const str = typeof value === 'string' ? value.toLowerCase().trim().replace(/\s+/g, '_') : 'unknown';
  if (CHAT_CATEGORY_ALIASES[str]) return CHAT_CATEGORY_ALIASES[str];
  return VALID_CATEGORIES.has(str) ? (str as ModerationCategory) : 'unknown';
}

function normalizeRiskLevel(value: unknown): RiskLevel | null {
  const str = typeof value === 'string' ? value.toLowerCase().trim() : '';
  if (str === 'low' || str === 'medium' || str === 'high' || str === 'critical' || str === 'safe') {
    return str === 'safe' ? 'low' : (str as RiskLevel);
  }
  return null;
}

/** Parse Gemini chat moderation JSON (category, risk, confidence, reason). */
export function parseChatModerationResponse(
  rawText: string,
  geminiFailed: boolean
): AiModerationResult {
  if (geminiFailed || !rawText) {
    return {
      riskScore: 0,
      confidenceScore: 0,
      category: 'unknown',
      reason: 'AI moderation unavailable — queued for manual review',
      shouldFlag: false,
      shouldBlock: false,
      geminiFailed: true,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    console.error('[moderation] Failed to parse Gemini chat JSON:', rawText.slice(0, 200));
    return {
      riskScore: 0,
      confidenceScore: 0,
      category: 'unknown',
      reason: 'AI response parse error — queued for manual review',
      shouldFlag: false,
      shouldBlock: false,
      geminiFailed: true,
      rawResponse: { raw: rawText },
    };
  }

  const category = normalizeCategory(parsed.category);
  const riskLevel =
    normalizeRiskLevel(parsed.risk) ??
    (typeof parsed.risk_level === 'string' ? normalizeRiskLevel(parsed.risk_level) : null);
  const confidenceScore = clampScore(parsed.confidence ?? parsed.confidence_score);
  const reason =
    typeof parsed.reason === 'string' && parsed.reason.trim()
      ? parsed.reason.trim()
      : 'No reason provided';

  const riskFromLevel = riskLevel ? riskScoreFromLevel(riskLevel) : null;
  let riskScore =
    riskFromLevel ??
    clampScore(parsed.risk_score ?? (category === 'safe' ? 0 : 65));

  let resolvedRiskLevel = riskLevel ?? riskLevelFromScore(riskScore);

  if (category === 'safe') {
    riskScore = 0;
    resolvedRiskLevel = 'low';
  }

  const shouldBlock =
    resolvedRiskLevel === 'critical' ||
    (riskScore >= MODERATION_THRESHOLDS.block &&
      confidenceScore >= MODERATION_THRESHOLDS.blockMinConfidence &&
      category !== 'safe');

  const shouldFlag =
    !shouldBlock &&
    (resolvedRiskLevel === 'high' ||
      resolvedRiskLevel === 'medium' ||
      (riskScore >= MODERATION_THRESHOLDS.flag && category !== 'safe'));

  return {
    riskScore,
    confidenceScore,
    category,
    reason,
    riskLevel: resolvedRiskLevel,
    shouldFlag,
    shouldBlock,
    rawResponse: parsed,
    geminiFailed: false,
  };
}

/**
 * Parses Gemini JSON output into a structured moderation result.
 * Applies business-logic thresholds for flag/block decisions.
 */
export function parseAiModerationResponse(
  rawText: string,
  geminiFailed: boolean
): AiModerationResult {
  if (geminiFailed || !rawText) {
    return {
      riskScore: 0,
      confidenceScore: 0,
      category: 'unknown',
      reason: 'AI moderation unavailable — queued for manual review',
      shouldFlag: false,
      shouldBlock: false,
      geminiFailed: true,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    console.error('[moderation] Failed to parse Gemini JSON:', rawText.slice(0, 200));
    return {
      riskScore: 0,
      confidenceScore: 0,
      category: 'unknown',
      reason: 'AI response parse error — queued for manual review',
      shouldFlag: false,
      shouldBlock: false,
      geminiFailed: true,
      rawResponse: { raw: rawText },
    };
  }

  const riskScore = clampScore(parsed.risk_score);
  const confidenceScore = clampScore(parsed.confidence_score);
  const category = normalizeCategory(parsed.category);
  const reason =
    typeof parsed.reason === 'string' && parsed.reason.trim()
      ? parsed.reason.trim()
      : 'No reason provided';

  const shouldBlock =
    riskScore >= MODERATION_THRESHOLDS.block &&
    confidenceScore >= MODERATION_THRESHOLDS.blockMinConfidence &&
    category !== 'safe';

  const shouldFlag = !shouldBlock && riskScore >= MODERATION_THRESHOLDS.flag && category !== 'safe';

  return {
    riskScore,
    confidenceScore,
    category,
    reason,
    shouldFlag,
    shouldBlock,
    rawResponse: parsed,
    geminiFailed: false,
  };
}

/** Parse Gemini project moderation JSON (safe, domain, confidence, reason, recommended_action). */
export function parseProjectModerationResponse(
  rawText: string,
  geminiFailed: boolean
): ProjectModerationResult {
  if (geminiFailed || !rawText) {
    return {
      safe: true,
      domain: 'AMBIGUOUS_PROJECT',
      confidence: 0,
      reason: 'AI moderation unavailable — queued for founder review',
      recommendedAction: 'FOUNDER_REVIEW',
      riskScore: 0,
      confidenceScore: 0,
      category: 'unknown',
      shouldFlag: true,
      shouldBlock: false,
      geminiFailed: true,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    console.error('[moderation] Failed to parse Gemini project JSON:', rawText.slice(0, 200));
    return {
      safe: true,
      domain: 'AMBIGUOUS_PROJECT',
      confidence: 0,
      reason: 'AI response parse error — queued for founder review',
      recommendedAction: 'FOUNDER_REVIEW',
      riskScore: 0,
      confidenceScore: 0,
      category: 'unknown',
      shouldFlag: true,
      shouldBlock: false,
      geminiFailed: true,
      rawResponse: { raw: rawText },
    };
  }

  const safe = normalizeBoolean(parsed.safe, true);
  const domain = normalizeDomain(parsed.domain);
  const confidence = clampScore(parsed.confidence ?? parsed.confidence_score);
  const reason =
    typeof parsed.reason === 'string' && parsed.reason.trim()
      ? parsed.reason.trim()
      : 'No reason provided';
  let recommendedAction = normalizeRecommendedAction(parsed.recommended_action);

  const riskScore = clampScore(parsed.risk_score);
  const confidenceScore = clampScore(parsed.confidence_score ?? parsed.confidence);
  const category = normalizeCategory(parsed.category);

  const policyBlock =
    !safe ||
    recommendedAction === 'REJECT' ||
    (riskScore >= MODERATION_THRESHOLDS.block &&
      confidenceScore >= MODERATION_THRESHOLDS.blockMinConfidence &&
      category !== 'safe');

  if (policyBlock) {
    recommendedAction = 'REJECT';
  } else if (domain === 'NON_AI_PROJECT' || domain === 'AMBIGUOUS_PROJECT') {
    recommendedAction = 'FOUNDER_REVIEW';
  } else if (domain === 'AI_PROJECT' && safe && recommendedAction !== 'REJECT') {
    recommendedAction = 'PUBLISH';
  }

  const shouldBlock = recommendedAction === 'REJECT';
  const shouldFlag = recommendedAction === 'FOUNDER_REVIEW' || (shouldBlock && category !== 'safe');

  return {
    safe: safe && !shouldBlock,
    domain,
    confidence,
    reason,
    recommendedAction,
    riskScore,
    confidenceScore,
    category,
    shouldFlag,
    shouldBlock,
    rawResponse: parsed,
    geminiFailed: false,
  };
}
