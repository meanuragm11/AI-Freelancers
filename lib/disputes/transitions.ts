import type { DisputeDecisionType, DisputeStatus } from '@/lib/disputes/constants';
import { DISPUTE_DECISION_TYPES, DISPUTE_STATUSES } from '@/lib/disputes/constants';

const ORDER: DisputeStatus[] = [
  'open',
  'under_investigation',
  'decision_recorded',
  'waiting_for_payment_execution',
  'closed',
];

export function disputeStatusIndex(status: string) {
  const idx = ORDER.indexOf(status as DisputeStatus);
  return idx === -1 ? 0 : idx;
}

export function canStartInvestigation(status: string) {
  return status === 'open';
}

export function canSaveDecision(status: string) {
  return status === 'open' || status === 'under_investigation';
}

export function assertValidDecisionInput(input: {
  decisionType: string;
  decisionSummary: string;
  buyerSplitPct?: number | null;
  builderSplitPct?: number | null;
}) {
  if (!DISPUTE_DECISION_TYPES.includes(input.decisionType as DisputeDecisionType)) {
    throw new Error('Invalid decision type');
  }
  if (input.decisionType === 'pending') {
    throw new Error('Select a decision before saving');
  }
  if (!input.decisionSummary.trim()) {
    throw new Error('Decision summary is required');
  }
  if (input.decisionType === 'split') {
    const buyer = Number(input.buyerSplitPct);
    const builder = Number(input.builderSplitPct);
    if (!Number.isFinite(buyer) || !Number.isFinite(builder)) {
      throw new Error('Split percentages are required');
    }
    if (buyer < 0 || builder < 0 || buyer + builder !== 100) {
      throw new Error('Buyer and builder split percentages must total 100');
    }
  }
}

export function nextStatusAfterSaveDecision(currentStatus: string): DisputeStatus {
  if (!canSaveDecision(currentStatus)) {
    throw new Error(`Cannot save a decision while dispute is ${currentStatus.replace(/_/g, ' ')}`);
  }
  return 'waiting_for_payment_execution';
}

export function paymentExecutionClosesDispute(decisionType: string) {
  return decisionType === 'cancelled';
}

export function isValidDisputeStatus(value: string) {
  return (DISPUTE_STATUSES as readonly string[]).includes(value);
}
