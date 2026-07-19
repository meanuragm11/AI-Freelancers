/**
 * Dashboard response DTOs for the future founder Finance Command Center.
 * Interfaces only — no UI or API wiring in Phase 1.
 *
 * Future integration: /founder/finance/* pages, FINANCE_DASHBOARD_ENABLED flag.
 */

export interface FinanceOverviewMetrics {
  totalEscrowHeldUsd: number;
  totalPlatformFeesUsd: number;
  pendingPayoutsUsd: number;
  pendingRefundsUsd: number;
  openDisputesCount: number;
  lastReconciliationAt: string | null;
  lastReconciliationStatus: string | null;
}

export interface FinanceOverviewResponse {
  metrics: FinanceOverviewMetrics;
  generatedAt: string;
}

export interface LedgerExplorerEntry {
  id: string;
  entryType: string;
  direction: string;
  accountType: string;
  netAmountUsd: number;
  currency: string;
  collabId: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface LedgerExplorerResponse {
  entries: LedgerExplorerEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FinanceInboxItem {
  id: string;
  category: 'refund' | 'payout' | 'dispute' | 'reconciliation';
  title: string;
  amountUsd: number | null;
  status: string;
  createdAt: string;
  entityId: string;
}

export interface FinanceInboxResponse {
  items: FinanceInboxItem[];
  unreadCount: number;
}

export interface PayoutQueueItem {
  payoutId: string;
  builderId: string;
  builderName: string | null;
  netAmount: number;
  currency: string;
  status: string;
  invoiceId: string | null;
  createdAt: string;
}

export interface PayoutQueueResponse {
  items: PayoutQueueItem[];
  totalPendingUsd: number;
}

export interface RefundQueueItem {
  refundRequestId: string;
  buyerId: string;
  builderId: string;
  requestedAmountUsd: number;
  status: string;
  collabId: string;
  transactionId: string;
  createdAt: string;
}

export interface RefundQueueResponse {
  items: RefundQueueItem[];
  totalPendingUsd: number;
}

export interface DisputeQueueItem {
  disputeId: string;
  collabId: string;
  settlementStatus: string;
  amountAtStakeUsd: number | null;
  openedAt: string;
}

export interface DisputeQueueResponse {
  items: DisputeQueueItem[];
  openCount: number;
}

export interface FinanceHealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  lastCheckedAt: string;
}

export interface FinanceHealthResponse {
  checks: FinanceHealthCheck[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
}
