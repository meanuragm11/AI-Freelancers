/**
 * Read-layer DTOs for founder Finance Command Center aggregation.
 * No raw DB rows — all public return types use these interfaces.
 *
 * Future integration: /founder/finance/* pages, GET /api/finance/* routes.
 */

export interface FinanceOverviewDto {
  escrowBalanceUsd: number;
  platformRevenueUsd: number;
  pendingPayoutsUsd: number;
  pendingRefundsUsd: number;
  pendingDisputesCount: number;
  builderPayablesUsd: number;
  todayRevenueUsd: number;
  monthlyRevenueUsd: number;
  /** Indicates whether metrics came primarily from finance V2 tables or production shadow tables. */
  dataSource: 'finance_v2' | 'production_shadow' | 'mixed';
  generatedAt: string;
}
