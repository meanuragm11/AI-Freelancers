/**
 * Ledger explorer entry DTO — sanitized view of finance_ledger_entries.
 */

export interface LedgerEntryDto {
  id: string;
  entryType: string;
  direction: string;
  accountType: string;
  grossAmountUsd: number;
  platformFeeUsd: number;
  taxAmountUsd: number;
  netAmountUsd: number;
  currency: string;
  buyerId: string | null;
  builderId: string | null;
  collabId: string | null;
  milestoneId: string | null;
  transactionId: string | null;
  invoiceId: string | null;
  refundRequestId: string | null;
  withdrawalId: string | null;
  disputeId: string | null;
  paymentProvider: string | null;
  providerReference: string | null;
  createdAt: string;
}
