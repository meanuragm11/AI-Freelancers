import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DisputeQueueReadService,
  FinanceHealthReadService,
  FinanceOverviewReadService,
  PayoutQueueReadService,
  RefundQueueReadService,
} from '@/lib/finance/read';
import type { FinanceHealthIssueDto } from '@/lib/finance/read/shared/dto/health';
import type { DisputeQueueItemDto } from '@/lib/finance/read/shared/dto/disputes';
import type { PayoutQueueItemDto } from '@/lib/finance/read/shared/dto/payouts';
import type { RefundQueueItemDto } from '@/lib/finance/read/shared/dto/refunds';
import { filterBySearch } from './search';
import {
  CONSOLE_PRIORITY_RANK,
  type ConsolePriority,
  type InboxResponse,
  type InboxUrgentItem,
} from './types';

const INBOX_FETCH_LIMIT = 100;

function healthSeverityToPriority(severity: FinanceHealthIssueDto['severity']): ConsolePriority {
  switch (severity) {
    case 'critical':
      return 'CRITICAL';
    case 'warning':
      return 'HIGH';
    case 'info':
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}

function refundQueueStatusToPriority(status: RefundQueueItemDto['queueStatus']): ConsolePriority {
  switch (status) {
    case 'waiting_founder':
      return 'CRITICAL';
    case 'pending':
    case 'waiting_builder':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

function disputeQueueStatusToPriority(status: DisputeQueueItemDto['queueStatus']): ConsolePriority {
  switch (status) {
    case 'waiting_founder':
      return 'HIGH';
    case 'settlement_pending':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

function payoutToUrgentItem(item: PayoutQueueItemDto): InboxUrgentItem {
  return {
    id: `payout:${item.source}:${item.id}`,
    type: 'payout',
    title: `Payout ${item.status}`,
    subtitle: `${item.builderName ?? item.builderId} · $${item.netAmountUsd.toFixed(2)}`,
    priority: item.requiresFounderAction ? 'HIGH' : 'MEDIUM',
    actionUrl: `/founder/payments?tab=withdrawals&q=${item.id}`,
    createdAt: item.createdAt,
  };
}

function refundToUrgentItem(item: RefundQueueItemDto): InboxUrgentItem {
  return {
    id: `refund:${item.id}`,
    type: 'refund',
    title: 'Refund review',
    subtitle: `$${item.requestedAmountUsd.toFixed(2)} · ${item.queueStatus.replace(/_/g, ' ')}`,
    priority: refundQueueStatusToPriority(item.queueStatus),
    actionUrl: `/founder/refunds?q=${item.id}`,
    createdAt: item.createdAt,
  };
}

function disputeToUrgentItem(item: DisputeQueueItemDto): InboxUrgentItem {
  return {
    id: `dispute:${item.id}`,
    type: 'dispute',
    title: 'Dispute review',
    subtitle: `${item.primaryReason} · ${item.queueStatus.replace(/_/g, ' ')}`,
    priority: disputeQueueStatusToPriority(item.queueStatus),
    actionUrl: `/founder/disputes/${item.id}`,
    createdAt: item.openedAt,
  };
}

function healthIssueToUrgentItem(issue: FinanceHealthIssueDto): InboxUrgentItem {
  return {
    id: issue.id,
    type: issue.type,
    title: issue.title,
    subtitle: issue.message,
    priority: healthSeverityToPriority(issue.severity),
    actionUrl: issue.entityId
      ? `/founder/finance/health?entityId=${encodeURIComponent(issue.entityId)}`
      : '/founder/finance',
    createdAt: issue.detectedAt,
  };
}

function sortUrgentItems(items: InboxUrgentItem[]): InboxUrgentItem[] {
  return [...items].sort((a, b) => {
    const rankDiff = CONSOLE_PRIORITY_RANK[b.priority] - CONSOLE_PRIORITY_RANK[a.priority];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getFinanceInbox(
  client: SupabaseClient,
  search?: string
): Promise<InboxResponse> {
  const overviewService = new FinanceOverviewReadService(client);
  const payoutService = new PayoutQueueReadService(client);
  const refundService = new RefundQueueReadService(client);
  const disputeService = new DisputeQueueReadService(client);
  const healthService = new FinanceHealthReadService(client);

  const [overview, payouts, refunds, disputes, health] = await Promise.all([
    overviewService.getOverview(),
    payoutService.listPayoutQueue({ requiresFounderAction: true }, { page: 1, pageSize: INBOX_FETCH_LIMIT }),
    refundService.listRefundQueue({ status: 'waiting_founder' }, { page: 1, pageSize: INBOX_FETCH_LIMIT }),
    disputeService.listDisputeQueue({ status: 'waiting_founder' }, { page: 1, pageSize: INBOX_FETCH_LIMIT }),
    healthService.getHealth({ maxIssues: INBOX_FETCH_LIMIT }),
  ]);

  let urgentItems: InboxUrgentItem[] = [
    ...payouts.items.map(payoutToUrgentItem),
    ...refunds.items.map(refundToUrgentItem),
    ...disputes.items.map(disputeToUrgentItem),
    ...health.issues.map(healthIssueToUrgentItem),
  ];

  urgentItems = filterBySearch(urgentItems, search, (item) => [
    item.id,
    item.type,
    item.title,
    item.subtitle,
    item.priority,
    item.actionUrl,
  ]);

  return {
    escrowBalance: overview.escrowBalanceUsd,
    pendingMoney: overview.pendingPayoutsUsd + overview.pendingRefundsUsd,
    financeHealth: health.overallStatus,
    urgentItems: sortUrgentItems(urgentItems),
  };
}
