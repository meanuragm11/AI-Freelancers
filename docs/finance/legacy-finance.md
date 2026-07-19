# Legacy Finance Implementations — Phase 1

Audit date: 2026-07-19  
**Do NOT remove** — document only, for Phase 2 migration planning.

---

## Legacy implementations

### 1. Direct project fund (no payment gateway)

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/project-requests/[id]/fund/route.ts` |
| **Reason legacy** | Marks collab/milestone/project as `funded` without Razorpay capture or `transactions` row |
| **Replacement** | `app/api/project-requests/[id]/prepare-checkout/route.ts` → Razorpay escrow checkout → `fulfillRazorpayPayment` |
| **Migration strategy** | Deprecate route; redirect UI to checkout; backfill missing transactions for historical rows |
| **Risk level** | **Critical** — bypasses payment verification |

---

### 2. Direct milestone fund (no payment gateway)

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/project-requests/[id]/fund-milestones/route.ts` |
| **Reason legacy** | Same as above for `milestone_payment` projects |
| **Replacement** | Per-milestone Razorpay checkout via `/checkout/escrow/[milestoneId]` |
| **Migration strategy** | Remove API route; ensure open-project hire flow creates fundable milestones |
| **Risk level** | **Critical** |

---

### 3. Workspace billing escrow release

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/workspace/billing/route.ts` |
| **Reason legacy** | Collab-level release (not milestone-level); Razorpay Route transfer commented out; duplicate invoice path |
| **Replacement** | Milestone accept flow in `app/api/milestones/[id]/route.ts` + future payout engine |
| **Migration strategy** | Identify callers of `release_escrow`; migrate to milestone accept; wire payout engine |
| **Risk level** | **High** — creates invoices without payment movement |

---

### 4. Component (AI asset) checkout type

| Attribute | Detail |
|-----------|--------|
| **Location** | `lib/payments/fulfillRazorpayPayment.ts` (lines 407–489), `app/api/razorpay/order/route.ts` (`component_purchase`) |
| **Reason legacy** | Pre–AI Solution unification; uses `components` table and `library.component_id` |
| **Replacement** | `service_purchase` / `checkoutType: 'solution'` via unified `services` table |
| **Migration strategy** | Migrate remaining published components to services; retain fulfill path until zero sales |
| **Risk level** | **Medium** — still active for old listings |

---

### 5. Free asset acquire routes

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/assets/[id]/acquire/route.ts`, `app/api/solutions/[id]/acquire/route.ts` |
| **Reason legacy** | Direct library insert without transaction for free items |
| **Replacement** | Zero-amount checkout or explicit `free_acquire` transaction type |
| **Migration strategy** | Log business event + optional $0 transaction row for audit trail |
| **Risk level** | **Low** — no money movement |

---

### 6. Client-side escrow create helper

| Attribute | Detail |
|-----------|--------|
| **Location** | `lib/hire/createEscrow.ts` |
| **Reason legacy** | Inserts `escrow_transactions` with `pending_payment` from browser client (RLS-dependent) |
| **Replacement** | Server-side escrow row creation in order/fulfill flow only |
| **Migration strategy** | Audit callers; move to admin client in API; primary path already uses fulfill insert |
| **Risk level** | **Medium** — duplicate/conflicting escrow rows possible |

---

### 7. Percentage-based platform fee (hire budget)

| Attribute | Detail |
|-----------|--------|
| **Location** | `lib/hire/calculateBudget.ts` — `platformFee(total) = total * 0.05` |
| **Reason legacy** | Original custom project modal math; inconsistent with flat $5 platform-wide |
| **Replacement** | `calculateOpenProposalPlatformFee` / `DEFAULT_PLATFORM_FEE_USD` |
| **Migration strategy** | Update `CustomProjectModal` to use flat fee; no API impact |
| **Risk level** | **Low** — display/preview only |

---

### 8. Profile total_earnings_usd fallback

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/builder/wallet/page.tsx` (line ~44) |
| **Reason legacy** | Falls back to `profiles.total_earnings_usd` when invoice sum is zero |
| **Replacement** | Always use `computeBuilderEarningsLedger()` via API |
| **Migration strategy** | Remove fallback; ensure ledger API is single source of truth |
| **Risk level** | **Medium** — stale balance display |

---

### 9. Duplicate PLATFORM_FEE constants

| Attribute | Detail |
|-----------|--------|
| **Location** | `PLATFORM_FEE = 5` in fund routes, `FLAT_PLATFORM_FEE_USD`, `ESCROW_PLATFORM_FEE_USD`, `PLATFORM_FEE_USD`, hardcoded `5` in milestone route |
| **Reason legacy** | Incremental feature development without shared constants module |
| **Replacement** | `lib/finance/constants/` (created Phase 1, not wired) |
| **Migration strategy** | Phase 2: replace usages behind `FINANCE_V2` flag |
| **Risk level** | **Low** — values currently aligned at $5 |

---

## Migration priority matrix

| Priority | Item | Risk | Effort |
|----------|------|------|--------|
| P0 | Legacy fund routes (#1, #2) | Critical | Medium |
| P1 | Workspace billing release (#3) | High | Medium |
| P1 | Payout engine stub completion | High | High |
| P2 | Component → service unification (#4) | Medium | High |
| P2 | Earnings single source of truth (#8) | Medium | Low |
| P3 | createEscrow client helper (#6) | Medium | Low |
| P3 | Fee constant consolidation (#9) | Low | Low |
| P3 | calculateBudget percentage (#7) | Low | Low |

---

## Safe deprecation checklist (Phase 2+)

- [ ] Confirm zero traffic to legacy fund routes (access logs)
- [ ] All open projects use Razorpay checkout path
- [ ] No UI calls `POST /api/workspace/billing` with `release_escrow`
- [ ] Invoice creation consolidated to single path
- [ ] SQL and TS earnings functions share test suite
- [ ] Feature flag `FINANCE_V2` gates new module entry points
