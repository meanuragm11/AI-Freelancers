/**
 * Finance health issue DTO for actionable founder alerts.
 */

export type FinanceHealthIssueSeverity = 'info' | 'warning' | 'critical';

export type FinanceHealthIssueType =
  | 'missing_payout_profile'
  | 'escrow_aged'
  | 'refund_pending_too_long'
  | 'failed_payout'
  | 'missing_invoice'
  | 'duplicate_idempotency_key'
  | 'reconciliation_mismatch'
  | 'missing_payout_reference';

export interface FinanceHealthIssueDto {
  id: string;
  type: FinanceHealthIssueType;
  severity: FinanceHealthIssueSeverity;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  amountUsd: number | null;
  detectedAt: string;
}

export interface FinanceHealthDto {
  issues: FinanceHealthIssueDto[];
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  generatedAt: string;
}
