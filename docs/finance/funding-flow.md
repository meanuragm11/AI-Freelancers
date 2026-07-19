# Funding Flow Audit — Phase 1

Audit date: 2026-07-19  
Payment provider: **Razorpay** (primary) + **legacy direct-fund routes** (no payment gateway)

---

## Funding paths overview

| Path | Entry point | Payment? | Fulfillment |
|------|-------------|----------|-------------|
| Escrow milestone | `/checkout/escrow/[milestoneId]` | Razorpay | `fulfillRazorpayPayment('escrow')` |
| Service purchase (instant) | `/checkout/solution/[serviceId]` | Razorpay | `fulfillRazorpayPayment('solution')` |
| AI asset (legacy component) | `/checkout/asset/[componentId]` | Razorpay | `fulfillRazorpayPayment('asset')` |
| Extra revision | MilestoneManager → RazorpayCheckoutButton | Razorpay | `fulfillRazorpayPayment('revision')` |
| Open project proposal | ProposalWizard → checkout | Razorpay (via milestone) | Same as escrow |
| Legacy project fund | `POST /api/project-requests/[id]/fund` | **None** | Direct DB updates |
| Legacy milestone fund | `POST /api/project-requests/[id]/fund-milestones` | **None** | Direct DB updates |
| Service hire (collab create) | Service page / hire flow | Deferred to Razorpay | Collab `pending_funding` |

---

## Primary Razorpay flow (all checkout types)

```mermaid
sequenceDiagram
  participant Buyer
  participant UI as RazorpayCheckoutButton
  participant Order as POST /api/razorpay/order
  participant RP as Razorpay SDK
  participant Verify as POST /api/razorpay/verify
  participant Webhook as POST /api/webhooks/razorpay
  participant Fulfill as fulfillRazorpayPayment
  participant DB as Supabase

  Buyer->>UI: Click Pay
  UI->>Order: Create order (transactionType, itemId)
  Order->>Order: Calculate platformFee + finalCharge
  Order->>RP: orders.create()
  Order->>DB: Insert transactions (status: pending)
  Order-->>UI: orderId, keyId, amountToPay
  UI->>RP: Open checkout modal
  RP-->>UI: payment_id + signature
  UI->>Verify: POST verify (order_id, payment_id, signature)
  Verify->>Verify: HMAC signature check
  Verify->>Fulfill: fulfillRazorpayPayment()
  Fulfill->>DB: Update transaction → completed
  Fulfill->>DB: Type-specific fulfillment
  Verify-->>UI: success

  Note over RP,Webhook: Async backup path
  RP->>Webhook: payment.captured / order.paid
  Webhook->>Fulfill: fulfillRazorpayPayment() (idempotent)
```

**Key files:**
- `components/RazorpayCheckoutButton.tsx` — client orchestration (lines ~412, 502)
- `app/api/razorpay/order/route.ts` — order creation + fee calculation
- `app/api/razorpay/verify/route.ts` — signature verify + fulfill
- `app/api/webhooks/razorpay/route.ts` — webhook backup fulfill
- `lib/payments/fulfillRazorpayPayment.ts` — shared fulfillment

---

## Escrow milestone funding

```mermaid
sequenceDiagram
  participant Buyer
  participant Checkout as /checkout/escrow/[id]
  participant Card as GET /api/milestones/[id]/card
  participant Order as POST /api/razorpay/order
  participant Fulfill as fulfillRazorpayPayment
  participant DB as Supabase

  Buyer->>Checkout: Load checkout page
  Checkout->>Card: Fetch amount + platformFee + totalDue
  Card->>Card: calculateEscrowMilestonePlatformFee()
  Buyer->>Order: transactionType=milestone_funding, itemId=milestoneId
  Order->>Order: resolveServiceListingCheckoutAmount()
  Order->>Order: calculateEscrowMilestonePlatformFee()
  Note over Fulfill,DB: On payment success
  Fulfill->>DB: milestones.status → funded
  Fulfill->>DB: collabs.status → funded
  Fulfill->>DB: proposal_platform_fee_charged / cumulative_new_milestones_fee_charged
  Fulfill->>DB: escrow_transactions insert (milestone_funding, funded)
  Fulfill->>DB: markProjectRequestFunded() if open project
  Fulfill->>DB: Chat message + notifications
```

**Transaction types mapped to escrow:** `escrow_funding`, `collab_milestone`, `milestone_funding`  
**Preflight:** `GET /api/razorpay/preflight`  
**Library sync fallback:** `POST /api/buyer/library/sync` can call fulfill for stuck payments

---

## Service purchase (instant AI Solution)

```mermaid
sequenceDiagram
  participant Buyer
  participant Checkout as /checkout/solution/[id]
  participant Order as POST /api/razorpay/order
  participant Fulfill as fulfillRazorpayPayment
  participant DB as Supabase

  Buyer->>Checkout: Load solution checkout
  Buyer->>Order: transactionType=service_purchase
  Order->>Order: platformFee = price < 20 ? 1 : 5
  Order->>Order: finalCharge = price (fee in fee_usd, not added to charge)
  Fulfill->>DB: library upsert (user_id, service_id)
  Fulfill->>DB: services.sales_count += 1
  Fulfill->>DB: Notifications to buyer + builder
```

**Note:** For instant purchases, `finalCharge = amountUsd` (buyer pays listing price); platform fee is recorded separately in `transactions.fee_usd`.

---

## AI asset purchase (legacy component)

Same as service purchase but:
- `transactionType=component_purchase`
- `checkoutType=asset` (mapped internally to `solution` path in order route for components)
- Fulfill writes to `library.component_id` and updates `components.sales_count`

Legacy acquire routes (non-Razorpay): `app/api/assets/[id]/acquire/route.ts`, `app/api/solutions/[id]/acquire/route.ts`

---

## Extra revision purchase

```mermaid
sequenceDiagram
  participant Buyer
  participant MM as MilestoneManager
  participant Order as POST /api/razorpay/order
  participant Fulfill as fulfillRazorpayPayment
  participant DB as Supabase

  Buyer->>MM: Pay for extra revision
  MM->>Order: transactionType=revision_purchase, itemId=collabId
  Order->>Order: amount = extra_revision_price_usd (platformFee=0)
  Fulfill->>DB: collabs.max_revisions += 1
  Fulfill->>DB: transactions.metadata.revision_slot_granted = true
  Fulfill->>DB: Notify builder
```

---

## Open project / proposal funding

```mermaid
sequenceDiagram
  participant Buyer
  participant PW as ProposalWizard
  participant Prep as POST prepare-checkout
  participant Hire as hireFromProposal
  participant Checkout as Razorpay escrow checkout
  participant Fulfill as fulfillRazorpayPayment

  PW->>PW: calculateOpenProposalPlatformFee(amount)
  Buyer->>Prep: Prepare checkout for project request
  Prep->>Prep: totalAmount = amount + PLATFORM_FEE_USD
  Hire->>Hire: Create collab + milestones (draft/pending_funding)
  Buyer->>Checkout: Fund first milestone via Razorpay
  Fulfill->>Fulfill: markProjectRequestFunded() when criteria met
```

**Files:** `lib/open-projects/hireFromProposal.ts`, `app/api/project-requests/[id]/prepare-checkout/route.ts`, `lib/project-proposals/service.ts`

---

## Legacy fund routes (no Razorpay)

```mermaid
sequenceDiagram
  participant Buyer
  participant Fund as POST /api/project-requests/[id]/fund
  participant DB as Supabase

  Buyer->>Fund: Fund accepted project request
  Fund->>DB: collabs.status → funded (no payment verification)
  Fund->>DB: milestones insert (status: funded)
  Fund->>DB: project_requests.status → funded
  Fund->>DB: Chat [[ESCROW_FUNDED]] message
```

**Risk:** No transaction record, no Razorpay capture, no `escrow_transactions` insert.  
**Replacement:** Razorpay escrow checkout via `prepare-checkout` + milestone funding.

---

## Order reuse & cleanup

| Mechanism | File | Purpose |
|-----------|------|---------|
| Pending order reuse | `app/api/razorpay/order/route.ts` | Reuse valid pending transaction if amount/fee match |
| Force refresh | Same | Expire stale pending transactions |
| Checkout cleanup cron | `app/api/checkout/cleanup/route.ts` | Expire abandoned `pending_funding` collabs |
| Preflight validation | `app/api/razorpay/preflight/route.ts` | Pre-open checkout validation |
| Error logging | `app/api/razorpay/checkout-error/route.ts` | Client-side failure telemetry |

---

## Currency conversion

`lib/payments/razorpayCurrency.ts` — `convertUsdToRazorpayCheckoutAmount()` converts USD display amounts to Razorpay smallest currency unit for order creation.
