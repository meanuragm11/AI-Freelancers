# Platform Fee Audit — Phase 1

Audit date: 2026-07-19  
All values documented as **currently implemented** — not proposed changes.

---

## Fee value reference

| Fee type | Current value | Logic |
|----------|---------------|-------|
| Original milestone / proposal escrow | **$5 flat** | Once per collab (`proposal_platform_fee_charged`) |
| New milestone (post-funding) | **$5 flat** | When cumulative new milestones ≥ **$50** threshold |
| Open project proposal display | **$5 flat** | `calculateOpenProposalPlatformFee()` |
| Instant purchase (service/component) | **$1** if price < $20, else **$5** | Buyer pays listing price; fee stored in `transactions.fee_usd` |
| Extra revision purchase | **$0** platform fee | Full price to platform; no separate fee line |
| Builder payout deduction | **$5 flat** | `gross - 5` on milestone release / escrow release |
| Legacy hire budget helper | **5% of total** | `lib/hire/calculateBudget.ts` — used in custom project UI only |

---

## Calculation locations

| File | Purpose | Current logic | Current value | Centralizable? |
|------|---------|---------------|---------------|----------------|
| `lib/milestones/platformFees.ts` | **Canonical escrow fee engine** | Original: flat if not charged; new: threshold-based cumulative | $5 / $50 threshold | **Yes** (already central for escrow) |
| `lib/milestones/newMilestoneFee.ts` | Re-export + preview helper for add-milestone UI | Delegates to `platformFees.ts` | $5 / $50 | Yes |
| `lib/solutions/constants.ts` | Instant AI Solution purchase fee | `amountUsd < 20 ? 1 : 5` | $1 / $5 | Yes |
| `lib/project-proposals/types.ts` | Proposal card constant | `PLATFORM_FEE_USD = 5` | $5 | Yes |
| `lib/project-proposals/service.ts` | Proposal card payload + funded notice | Uses `PLATFORM_FEE_USD` | $5 | Yes |
| `lib/builder/earningsLedger.ts` | Builder net from gross escrow | `gross - BUILDER_PLATFORM_FEE_USD` | $5 | Yes |
| `lib/hire/calculateBudget.ts` | Custom project modal budget preview | `total * 0.05` (percentage) | 5% | Yes (note: differs from flat $5 elsewhere) |
| `app/api/razorpay/order/route.ts` | Razorpay order amount + `fee_usd` on transaction | Escrow: `calculateEscrowMilestonePlatformFee`; component/service: `<20 ? 1 : 5`; revision: 0 | $0–$5 | Yes |
| `app/api/milestones/[id]/card/route.ts` | Checkout summary for milestone | `calculateEscrowMilestonePlatformFee` | $5 / threshold | Yes |
| `app/api/milestones/[id]/route.ts` | Milestone accept → invoice insert | Hardcoded `platform_fee_usd: 5`, `net = gross - 5` | $5 | Yes |
| `app/api/workspace/billing/route.ts` | Legacy collab escrow release | `FLAT_PLATFORM_FEE_USD = 5.00` | $5 | Yes |
| `app/api/project-requests/[id]/fund/route.ts` | **Legacy** direct fund (no Razorpay) | `PLATFORM_FEE = 5` | $5 | Yes |
| `app/api/project-requests/[id]/fund-milestones/route.ts` | **Legacy** milestone fund | `PLATFORM_FEE = 5` | $5 | Yes |
| `app/api/project-requests/[id]/prepare-checkout/route.ts` | Open project checkout total | `PLATFORM_FEE_USD` from types | $5 | Yes |
| `app/api/collabs/[id]/add-milestone/route.ts` | New milestone fee preview | `PLATFORM_FEE_THRESHOLD=50`, `PLATFORM_FEE=5` | $5 / $50 | Yes |
| `app/api/collabs/[id]/milestones/route.ts` | Milestone creation fee preview | `NEW_MILESTONE_PLATFORM_FEE_USD` | $5 | Yes |
| `lib/payments/fulfillRazorpayPayment.ts` | Post-payment fee flag updates | Reads `transactions.fee_usd` or recalculates | From order | Yes (read path) |
| `lib/payments/razorpayOrderValidation.ts` | Order reuse validation | Compares `platform_fee_usd` note | From order | Yes (validation) |
| `app/checkout/[type]/[id]/page.tsx` | Checkout page display fallback | `ESCROW_PLATFORM_FEE_USD = 5` | $5 | Yes |
| `components/CustomProjectModal.tsx` | Custom project UI | Hardcoded `+$5` display | $5 | Yes |
| `components/MilestoneManager.tsx` | Add-milestone fee preview fallback | Hardcoded `5` when threshold met | $5 | Yes |
| `components/open-projects/ProposalWizard.tsx` | Builder net payout display | `calculateOpenProposalPlatformFee` | $5 | Yes |
| `components/chat/ProjectProposalCard.tsx` | Total with platform fee display | `payload.platformFeeUsd` | $5 | No (display only) |
| `supabase/migrations/20260702140000_proposal_platform_fee_charged.sql` | Backfill migration | `fee_usd >= 5` | $5 | No (historical) |
| `supabase/migrations/20260704152000_withdrawal_workflow_hardening.sql` | SQL lifetime earnings | `escrow_amount_usd - 5` for unreleased collabs | $5 | Yes (SQL mirror) |

---

## `extra_revision_price_usd` (not platform fee)

| File | Purpose | Current logic | Centralizable? |
|------|---------|---------------|----------------|
| `lib/services/form.ts` | Service form default | Default `25` | No (listing config) |
| `app/api/razorpay/order/route.ts` | Revision checkout amount | `collab.extra_revision_price_usd ?? service.extra_revision_price_usd` | No |
| `components/MilestoneManager.tsx` | Extra revision purchase UI | Displays collab/service price | No |
| `app/api/milestones/[id]/route.ts` | Revision limit enforcement | Reads collab/service price | No |

---

## Duplication hotspots (Phase 2 targets)

1. **Hardcoded `5`** in 8+ API routes vs `lib/milestones/platformFees.ts`
2. **Instant purchase fee** duplicated in `razorpay/order/route.ts` and `lib/solutions/constants.ts` (`platformFeeForInstantPurchase` exists but is unused in order route)
3. **Builder net** duplicated in TS (`earningsLedger.ts`) and SQL (`compute_builder_lifetime_earnings_usd`)
4. **Percentage vs flat** — `lib/hire/calculateBudget.ts` uses 5% while rest of platform uses flat $5

---

## Recommended centralization map (future — not implemented)

```
lib/finance/constants/platformFees.ts  → DEFAULT_PLATFORM_FEE_USD, MIN_PLATFORM_FEE_USD
lib/milestones/platformFees.ts         → escrow-specific rules (keep)
lib/solutions/constants.ts             → instant purchase rules (keep)
lib/finance/fees/                      → unified resolver (Phase 2)
```
