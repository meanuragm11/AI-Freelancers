# Escrow State Change Audit — Phase 1

Audit date: 2026-07-19  
Tables: `collabs`, `milestones`, `escrow_transactions`, `transactions`, `disputes`, `refund_requests`

---

## Escrow lifecycle overview

```mermaid
stateDiagram-v2
  direction TB
  state "Funding" as funding {
    [*] --> pending_funding: Collab created
    pending_funding --> funded: Razorpay fulfill / legacy fund
  }
  state "Lock" as lock {
    funded --> in_progress: Builder starts
    in_progress --> submitted: Builder submits
  }
  state "Release" as release {
    submitted --> released: Buyer accepts
    released --> completed: All milestones released
  }
  state "Freeze" as freeze {
    funded --> disputed: Dispute opened
    in_progress --> disputed
    submitted --> disputed
  }
  state "Refund" as refund {
    disputed --> refunded: Refund approved
    funded --> refunded: Buyer refund on captured txn
  }
```

---

## Funding (money in)

| File | Line | Action | State changes |
|------|------|--------|---------------|
| `lib/payments/fulfillRazorpayPayment.ts` | 95–99 | Escrow payment captured | `milestones.status → funded` |
| `lib/payments/fulfillRazorpayPayment.ts` | 127–136 | Collab activation | `collabs.status → funded`; fee flags updated |
| `lib/payments/fulfillRazorpayPayment.ts` | 197–205 | Escrow ledger row | `escrow_transactions` insert (`milestone_funding`, `funded`) |
| `lib/hire/createEscrow.ts` | 14–21 | Pre-payment escrow row | `escrow_transactions` insert (`pending_payment`) — client-side helper |
| `app/api/project-requests/[id]/fund/route.ts` | 58–73 | **Legacy** fund | collab + milestone → `funded` (no escrow_transactions) |
| `app/api/project-requests/[id]/fund-milestones/route.ts` | 68–81 | **Legacy** milestone fund | Same pattern |

---

## Lock (funds held)

Funds are considered locked when:
- `milestones.status IN ('funded', 'in_progress', 'submitted')` — see `LOCKED_MILESTONE_STATUSES` in `lib/marketplace/status.ts`
- `escrow_transactions.status = 'funded'` with locked milestone

| File | Line | Action |
|------|------|--------|
| `lib/builder/earningsLedger.ts` | 190–192 | Counts locked escrow toward `pendingEscrowUsd` |
| `app/api/milestones/[id]/route.ts` | — | `start_work` → `in_progress`; `submit` → `submitted` |
| `components/MilestoneManager.tsx` | 201–203 | UI "Locked in Escrow" totals |

**No explicit `locked` status** — lock is derived from milestone/collab status combination.

---

## Freeze (dispute hold)

| File | Line | Action | State changes |
|------|------|--------|---------------|
| `app/api/disputes/route.ts` | — | Dispute opened | Collab → `disputed`; blocks funding/release |
| `app/api/razorpay/order/route.ts` | 180–184 | Active dispute check | Rejects new escrow orders |
| `app/api/workspace/billing/route.ts` | 68–77 | Active dispute check | Rejects escrow release |
| `lib/payments/fulfillRazorpayPayment.ts` | 83–93 | Active dispute check | Blocks fulfillment |
| `lib/disputes/constants.ts` | — | `ACTIVE_DISPUTE_STATUSES` | Shared freeze gate |

Dispute payment execution status: `pending`, `in_progress`, `completed`, `failed`, `not_required` (DB migration `20260718100000`).

---

## Release (money to builder)

| File | Line | Action | State changes |
|------|------|--------|---------------|
| `app/api/milestones/[id]/route.ts` | 286–308 | Milestone accept | `milestones → released`; invoice created |
| `app/api/workspace/billing/route.ts` | 49–133 | Legacy release_escrow | Invoice created; `collabs → completed` |
| `app/api/collabs/[id]/complete/route.ts` | 43–52 | Project complete | Requires all milestones `released`; collab → `completed` |
| `lib/disputes/completePaymentExecution.ts` | 70–74 | Dispute release decision | Collab → `released` (or `funded` if cancelled) |

**Note:** Milestone release creates invoice but does **not** trigger Razorpay payout transfer.

---

## Refund (money back to buyer)

| File | Line | Action | State changes |
|------|------|--------|---------------|
| `lib/refunds/service.ts` | 97–114 | Create refund request | `refund_requests` insert |
| `lib/refunds/service.ts` | 244–270 | Approve refund | Razorpay refund API; `transactions → refunded` |
| `lib/refunds/service.ts` | 273–274 | Dispute linkage | `maybeCompleteDisputeFromRefund()` |
| `app/api/refunds/route.ts` | — | Buyer-initiated refund API | Delegates to refund service |
| `app/api/founder/refunds/[id]/route.ts` | — | Founder refund decision | Delegates to refund service |
| `app/api/collabs/[id]/refundable-transactions/route.ts` | — | Lists refundable txns | Read-only |
| `lib/builder/earningsLedger.ts` | 288–296 | Cancelled collab | Synthetic `escrow_refund` ledger entry |

Escrow transaction status values observed: `pending_payment`, `funded` (no `released`/`refunded` on escrow_transactions table in app code).

---

## Completion

| File | Line | Action |
|------|------|--------|
| `app/api/collabs/[id]/complete/route.ts` | 52 | Collab → `completed`, `completion_percentage: 100` |
| `app/api/workspace/billing/route.ts` | 130–133 | Collab → `completed` on legacy release |
| `lib/project-proposals/service.ts` | 248 | `project_requests.status → funded` (funding, not completion) |

---

## Escrow transactions schema usage

| transaction_type | status values | Created by |
|------------------|---------------|------------|
| `milestone_funding` | `pending_payment` | `lib/hire/createEscrow.ts` |
| `milestone_funding` | `funded` | `lib/payments/fulfillRazorpayPayment.ts` |

Unique index: `idx_escrow_transactions_unique_funding` on `(milestone_id, transaction_type)` — migration `20260701184100`.

---

## Business events logged

| Event | File |
|-------|------|
| `payment.captured` | `fulfillRazorpayPayment.ts:61` |
| `escrow.funded` | `fulfillRazorpayPayment.ts:214` |
| `refund.requested` / `refund.completed` / `refund.failed` | `lib/refunds/service.ts` |
| `dispute.closed` | `lib/disputes/completePaymentExecution.ts` |

---

## Integration points for Finance Phase 2

1. Unified escrow state machine (replace derived lock from multiple status arrays)
2. Wire `escrow_transactions` status transitions through release/refund
3. Idempotent release/refund with ledger entries
4. Dispute freeze/unfreeze as explicit escrow flag
