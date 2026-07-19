/**
 * Payout queue item DTO — unified view of finance_payouts and production withdrawals/invoices.
 */

export type PayoutQueueSource = 'finance_v2' | 'withdrawal' | 'invoice';

export interface PayoutQueueItemDto {
  id: string;
  source: PayoutQueueSource;
  builderId: string;
  builderName: string | null;
  grossAmountUsd: number;
  netAmountUsd: number;
  platformFeeUsd: number;
  currency: string;
  status: string;
  invoiceId: string | null;
  withdrawalReference: string | null;
  requiresFounderAction: boolean;
  createdAt: string;
  processedAt: string | null;
}
