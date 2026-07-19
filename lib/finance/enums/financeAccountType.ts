/**
 * Account buckets for finance ledger entries.
 * Mirrors public.finance_account_type.
 *
 * Future integration: escrow hold/release, builder wallet, platform revenue.
 */

export enum FinanceAccountType {
  BuyerWallet = 'buyer_wallet',
  BuilderWallet = 'builder_wallet',
  PlatformRevenue = 'platform_revenue',
  EscrowHold = 'escrow_hold',
  External = 'external',
}

export const FINANCE_ACCOUNT_TYPES = Object.values(FinanceAccountType);
