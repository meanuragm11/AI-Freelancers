import type { RiskLevel } from './types';
import type { AiModerationResult } from './types';

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/** Founder alerts only for medium/high/critical violations — never safe or low. */
export function requiresFounderAlert(
  result: Pick<AiModerationResult, 'riskScore' | 'riskLevel' | 'category'>
): boolean {
  if (result.category === 'safe') return false;
  const level = result.riskLevel ?? riskLevelFromScore(result.riskScore);
  return level === 'medium' || level === 'high' || level === 'critical';
}

export function riskScoreFromLevel(level: string | undefined): number | null {
  const normalized = level?.toLowerCase().trim();
  switch (normalized) {
    case 'critical':
      return 90;
    case 'high':
      return 75;
    case 'medium':
      return 50;
    case 'low':
      return 10;
    case 'safe':
      return 0;
    default:
      return null;
  }
}
