/**
 * Allowed state transitions for finance lifecycle enums.
 *
 * Future integration: EscrowFinanceService, FinancePayoutService, reconciliation.
 */

import {
  EscrowStatus,
  PayoutStatus,
  ReconciliationStatus,
  RefundStatus,
  type DisputeSettlementStatus,
} from '../enums';
import { FinanceValidationError } from './moneyValidator';

type TransitionMap<T extends string> = Readonly<Record<T, readonly T[]>>;

const ESCROW_TRANSITIONS: TransitionMap<EscrowStatus> = {
  [EscrowStatus.Pending]: [EscrowStatus.Funded, EscrowStatus.Cancelled],
  [EscrowStatus.Funded]: [EscrowStatus.Frozen, EscrowStatus.Released, EscrowStatus.Refunded],
  [EscrowStatus.Frozen]: [EscrowStatus.Funded, EscrowStatus.Refunded, EscrowStatus.Released],
  [EscrowStatus.Released]: [],
  [EscrowStatus.Refunded]: [],
  [EscrowStatus.Cancelled]: [],
};

const PAYOUT_TRANSITIONS: TransitionMap<PayoutStatus> = {
  [PayoutStatus.Pending]: [PayoutStatus.Processing, PayoutStatus.Cancelled],
  [PayoutStatus.Processing]: [PayoutStatus.Completed, PayoutStatus.Failed],
  [PayoutStatus.Completed]: [],
  [PayoutStatus.Failed]: [PayoutStatus.Pending],
  [PayoutStatus.Cancelled]: [],
};

const REFUND_TRANSITIONS: TransitionMap<RefundStatus> = {
  [RefundStatus.Requested]: [RefundStatus.Processing, RefundStatus.Cancelled],
  [RefundStatus.Processing]: [RefundStatus.Completed, RefundStatus.Failed],
  [RefundStatus.Completed]: [],
  [RefundStatus.Failed]: [RefundStatus.Processing],
  [RefundStatus.Cancelled]: [],
};

const RECONCILIATION_TRANSITIONS: TransitionMap<ReconciliationStatus> = {
  [ReconciliationStatus.Pending]: [ReconciliationStatus.Running, ReconciliationStatus.Failed],
  [ReconciliationStatus.Running]: [ReconciliationStatus.Completed, ReconciliationStatus.Failed],
  [ReconciliationStatus.Completed]: [],
  [ReconciliationStatus.Failed]: [ReconciliationStatus.Pending],
};

function assertTransition<T extends string>(
  current: T,
  next: T,
  map: TransitionMap<T>,
  entity: string
): void {
  const allowed = map[current] ?? [];
  if (!allowed.includes(next)) {
    throw new FinanceValidationError(
      `Invalid ${entity} transition: ${current} → ${next}`,
      'status'
    );
  }
}

export const StateTransitionValidator = {
  escrow(current: EscrowStatus, next: EscrowStatus): void {
    assertTransition(current, next, ESCROW_TRANSITIONS, 'escrow');
  },

  payout(current: PayoutStatus, next: PayoutStatus): void {
    assertTransition(current, next, PAYOUT_TRANSITIONS, 'payout');
  },

  refund(current: RefundStatus, next: RefundStatus): void {
    assertTransition(current, next, REFUND_TRANSITIONS, 'refund');
  },

  reconciliation(current: ReconciliationStatus, next: ReconciliationStatus): void {
    assertTransition(current, next, RECONCILIATION_TRANSITIONS, 'reconciliation');
  },

  /** Dispute settlements are founder-driven; allow any forward move from pending/in_review. */
  disputeSettlement(
    current: DisputeSettlementStatus,
    next: DisputeSettlementStatus
  ): void {
    if (current === next) return;
    const terminal = ['settled_buyer', 'settled_builder', 'split', 'cancelled'] as const;
    if ((terminal as readonly string[]).includes(current)) {
      throw new FinanceValidationError(
        `Dispute settlement is terminal at ${current}`,
        'settlement_status'
      );
    }
  },
};
