/**
 * Finance Phase 1 shared constants — created for future phases.
 * Existing code continues to use inline / domain-specific constants until Finance V2.
 */

export { DEFAULT_PLATFORM_FEE_USD, MIN_PLATFORM_FEE_USD } from './platformFees';
export { DEFAULT_CURRENCY } from './currency';
export { SUPPORTED_PAYMENT_PROVIDER } from './paymentProvider';
export { FINANCE_VERSION } from './version';
export {
  FINANCE_V2,
  LEDGER_ENABLED,
  FINANCE_EVENTS_ENABLED,
  RECONCILIATION_ENABLED,
  PAYOUT_ENGINE_ENABLED,
  FINANCE_DASHBOARD_ENABLED,
} from './featureFlags';
export {
  FINANCE_TABLES,
  FINANCE_AMOUNT_PRECISION,
  FINANCE_DEFAULT_PAGE_SIZE,
} from './tables';
