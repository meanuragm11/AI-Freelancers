import {
  DEFAULT_CURRENCY,
  DEFAULT_PLATFORM_FEE_USD,
  FINANCE_DASHBOARD_ENABLED,
  FINANCE_EVENTS_ENABLED,
  FINANCE_V2,
  FINANCE_VERSION,
  LEDGER_ENABLED,
  MIN_PLATFORM_FEE_USD,
  PAYOUT_ENGINE_ENABLED,
  RECONCILIATION_ENABLED,
  SUPPORTED_PAYMENT_PROVIDER,
} from '@/lib/finance/constants';

export interface FinanceSettingsResponse {
  platformFee: {
    defaultUsd: number;
    minUsd: number;
  };
  currency: {
    default: string;
    supported: string[];
  };
  paymentProviders: string[];
  version: string;
  featureFlags: {
    financeV2: boolean;
    ledgerEnabled: boolean;
    financeEventsEnabled: boolean;
    reconciliationEnabled: boolean;
    payoutEngineEnabled: boolean;
    financeDashboardEnabled: boolean;
  };
}

export function getFinanceSettings(): FinanceSettingsResponse {
  return {
    platformFee: {
      defaultUsd: DEFAULT_PLATFORM_FEE_USD,
      minUsd: MIN_PLATFORM_FEE_USD,
    },
    currency: {
      default: DEFAULT_CURRENCY,
      supported: [DEFAULT_CURRENCY],
    },
    paymentProviders: [SUPPORTED_PAYMENT_PROVIDER],
    version: FINANCE_VERSION,
    featureFlags: {
      financeV2: FINANCE_V2,
      ledgerEnabled: LEDGER_ENABLED,
      financeEventsEnabled: FINANCE_EVENTS_ENABLED,
      reconciliationEnabled: RECONCILIATION_ENABLED,
      payoutEngineEnabled: PAYOUT_ENGINE_ENABLED,
      financeDashboardEnabled: FINANCE_DASHBOARD_ENABLED,
    },
  };
}
