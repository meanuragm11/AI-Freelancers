/**
 * Filter interfaces for Finance Read Layer list endpoints.
 */

import type { DisputeQueueStatusFilter } from './dto/disputes';
import type { RefundQueueStatusFilter } from './dto/refunds';

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

export interface TimelineFilters extends DateRangeFilter {
  entity?: string;
  builderId?: string;
  buyerId?: string;
  invoiceId?: string;
  collabId?: string;
  transactionId?: string;
  eventType?: string;
  status?: string;
}

export interface LedgerFilters extends DateRangeFilter {
  builderId?: string;
  buyerId?: string;
  invoiceId?: string;
  collabId?: string;
  transactionId?: string;
  entryType?: string;
  direction?: string;
}

export interface PayoutQueueFilters extends DateRangeFilter {
  builderId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  requiresFounderAction?: boolean;
}

export interface RefundQueueFilters extends DateRangeFilter {
  builderId?: string;
  buyerId?: string;
  collabId?: string;
  status?: RefundQueueStatusFilter;
}

export interface DisputeQueueFilters extends DateRangeFilter {
  buyerId?: string;
  builderId?: string;
  collabId?: string;
  status?: DisputeQueueStatusFilter;
}

export interface FinanceHealthOptions {
  escrowAgeDays?: number;
  refundPendingDays?: number;
  maxIssues?: number;
}
