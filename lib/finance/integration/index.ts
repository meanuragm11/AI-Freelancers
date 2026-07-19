/**
 * Finance V2 shadow integration barrel — dual-write helpers for production flows.
 */

export {
  FinanceIntegrationService,
  createFinanceIntegrationService,
  buildFinanceEventIdempotencyKey,
  buildPaymentCapturedIdempotencyKey,
  buildEscrowFundedIdempotencyKey,
  buildMilestoneReleasedIdempotencyKey,
} from './FinanceIntegrationService';

export type { PaymentCapturedContext } from './FinanceIntegrationService';
