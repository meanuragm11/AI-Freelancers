# Founder Finance Console API

Read-only GET endpoints for the Founder Finance Console. All routes live under `/api/founder/finance/*` and delegate to thin controllers in `lib/finance/console/`, which call Finance Read Layer services in `lib/finance/read/`.

## Access Control

| Condition | HTTP status | Response |
|-----------|-------------|----------|
| `FINANCE_DASHBOARD_ENABLED === false` | 404 | `{ "error": "Not found" }` |
| No authenticated session | 401 | `{ "error": "Unauthorized" }` |
| Authenticated but `profiles.is_admin !== true` | 403 | `{ "error": "Forbidden" }` |
| Founder + feature flag enabled | 200 | Endpoint payload |

Auth uses `requireFounder()` from `lib/founder/server.ts` (Supabase session cookie + service-role profile lookup).

## Feature Flag

All endpoints check `FINANCE_DASHBOARD_ENABLED` from `lib/finance/constants/featureFlags.ts`. The flag is **read-only** in settings; do not enable it in code until rollout.

---

## GET /api/founder/finance/inbox

Finance command-center inbox: escrow balance, pending money, health status, and merged urgent items.

### Query parameters

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Optional global search across urgent item fields |

### Response

```json
{
  "escrowBalance": 12500.0,
  "pendingMoney": 3200.0,
  "financeHealth": "degraded",
  "urgentItems": [
    {
      "id": "refund:uuid",
      "type": "refund",
      "title": "Refund review",
      "subtitle": "$150.00 · waiting founder",
      "priority": "CRITICAL",
      "actionUrl": "/founder/refunds?q=uuid",
      "createdAt": "2026-07-01T12:00:00.000Z"
    }
  ]
}
```

### Data sources (read layer)

- `FinanceOverviewReadService` — escrow balance, pending payouts/refunds
- `PayoutQueueReadService` — payouts requiring founder action
- `RefundQueueReadService` — refunds waiting for founder
- `DisputeQueueReadService` — disputes waiting for founder
- `FinanceHealthReadService` — health issues (missing payout profile, aged escrows, failed payouts, etc.)

Urgent items are sorted by priority: **CRITICAL > HIGH > MEDIUM > LOW**, then by `createdAt` descending.

### Example

```bash
curl -b cookies.txt "https://localhost:3000/api/founder/finance/inbox?search=failed"
```

---

## GET /api/founder/finance/payouts

Unified payout queue from finance V2 payouts, builder withdrawals, and processing invoices.

### Query parameters

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default 1) |
| `pageSize` | number | Items per page (default 50, max 200) |
| `builder` | uuid | Filter by builder ID |
| `country` | string | Reserved client-side filter (limited DTO support) |
| `currency` | string | Filter by currency code (e.g. `USD`) |
| `status` | string | `pending`, `processing`, `completed`, or `failed` |
| `search` | string | Search id, builder name, status, reference, amounts |
| `sort` | string | Sort field (default `created_at`) |
| `direction` | string | Sort direction: `asc` or `desc` (default `desc`) |
| `from` | ISO date | Created-at lower bound |
| `to` | ISO date | Created-at upper bound |

### Response

```json
{
  "items": [
    {
      "id": "uuid",
      "source": "withdrawal",
      "builderId": "uuid",
      "builderName": "Jane Builder",
      "grossAmountUsd": 500,
      "netAmountUsd": 495,
      "platformFeeUsd": 5,
      "currency": "USD",
      "status": "pending",
      "invoiceId": null,
      "withdrawalReference": "WD-123",
      "requiresFounderAction": true,
      "createdAt": "2026-07-01T12:00:00.000Z",
      "processedAt": null
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  },
  "groups": {
    "pending": 10,
    "processing": 5,
    "completed": 25,
    "failed": 2
  }
}
```

### Example

```bash
curl -b cookies.txt "https://localhost:3000/api/founder/finance/payouts?status=pending&page=1&pageSize=20"
```

---

## GET /api/founder/finance/cases

Merged refund and dispute cases for a single founder queue view.

### Query parameters

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | `all` (default), `refunds`, or `disputes` |
| `status` | string | Refund/dispute queue status filter |
| `priority` | string | `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` |
| `page` | number | Page number (default 1) |
| `pageSize` | number | Items per page (default 50) |
| `search` | string | Search id, names, project title, status, amount |
| `sort` | string | Sort field (default `openedAt`) |
| `direction` | string | Sort direction: `asc` or `desc` |
| `from` | ISO date | Opened-at lower bound |
| `to` | ISO date | Opened-at upper bound |

### Response

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "dispute",
      "buyer": { "id": "uuid", "name": "Buyer Name" },
      "builder": { "id": "uuid", "name": "Builder Name" },
      "project": { "id": "uuid", "title": "Collab Title" },
      "amount": 1200,
      "status": "waiting_founder",
      "openedAt": "2026-07-01T12:00:00.000Z",
      "priority": "HIGH",
      "assignedTo": null,
      "actionUrl": "/founder/disputes/uuid"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  }
}
```

### Example

```bash
curl -b cookies.txt "https://localhost:3000/api/founder/finance/cases?type=all&priority=CRITICAL"
```

---

## GET /api/founder/finance/ledger

Paginated finance ledger explorer.

### Query parameters

| Param | Type | Description |
|-------|------|-------------|
| `builder` | uuid | Builder ID |
| `buyer` | uuid | Buyer ID |
| `invoice` | uuid | Invoice ID |
| `project` / `collab` | uuid | Collab / project ID |
| `transaction` | uuid | Transaction ID |
| `ledgerId` | uuid | Exact ledger entry ID |
| `date` | ISO date | Single-day filter (sets from/to) |
| `from` / `to` | ISO date | Created-at range |
| `entryType` | string | Ledger entry type |
| `direction` | string | Entry direction filter (`credit` / `debit`) |
| `currency` | string | Currency code |
| `page` | number | Page number |
| `pageSize` | number | Items per page |
| `search` | string | Global search across entry fields |
| `sort` | string | Sort field (default `created_at`) |
| `sortDir` | string | Sort direction: `asc` or `desc` (default `desc`) |

> **Note:** `direction` is the ledger entry filter. Use `sortDir` for pagination sort order because `direction` is reserved for credit/debit filtering.

### Response

```json
{
  "items": [
    {
      "id": "uuid",
      "entryType": "escrow_hold",
      "direction": "credit",
      "accountType": "escrow_hold",
      "grossAmountUsd": 100,
      "platformFeeUsd": 5,
      "taxAmountUsd": 0,
      "netAmountUsd": 95,
      "currency": "USD",
      "buyerId": "uuid",
      "builderId": "uuid",
      "collabId": "uuid",
      "transactionId": "uuid",
      "createdAt": "2026-07-01T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 50,
    "totalPages": 2
  }
}
```

### Example

```bash
curl -b cookies.txt "https://localhost:3000/api/founder/finance/ledger?builder=uuid&search=escrow&page=1"
```

---

## GET /api/founder/finance/settings

Read-only finance configuration and feature flags.

### Response

```json
{
  "platformFee": {
    "defaultUsd": 5,
    "minUsd": 1
  },
  "currency": {
    "default": "USD",
    "supported": ["USD"]
  },
  "paymentProviders": ["razorpay"],
  "version": "1.0.0",
  "featureFlags": {
    "financeV2": false,
    "ledgerEnabled": false,
    "financeEventsEnabled": false,
    "reconciliationEnabled": false,
    "payoutEngineEnabled": false,
    "financeDashboardEnabled": false
  }
}
```

### Example

```bash
curl -b cookies.txt "https://localhost:3000/api/founder/finance/settings"
```

---

## Architecture

```
app/api/founder/finance/*/route.ts   ← thin GET handlers (auth + query parse)
        ↓
lib/finance/console/*Controller.ts   ← DTO mapping, search, merge
        ↓
lib/finance/read/*ReadService.ts     ← read-only aggregation (unchanged)
```

No writes, no payment logic changes, no UI. Read services and foundation/integration layers are not modified by these routes.

## Error Responses

| Status | When |
|--------|------|
| 401 | Unauthenticated |
| 403 | Authenticated non-founder |
| 404 | Finance dashboard feature flag disabled |
| 500 | Unexpected server/read-layer error `{ "error": "message" }` |
