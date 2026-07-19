-- Finance V2 Foundation: append-only ledger & events, payouts, reconciliation.
-- Infrastructure only — no wiring to existing payment/refund/milestone flows.

-- ── ENUMS ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_ledger_entry_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_ledger_entry_type AS ENUM (
      'escrow_deposit',
      'escrow_release',
      'escrow_refund',
      'platform_fee',
      'payout',
      'withdrawal',
      'refund',
      'adjustment',
      'dispute_settlement',
      'component_sale',
      'milestone_release'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_direction'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_direction AS ENUM ('debit', 'credit');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_account_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_account_type AS ENUM (
      'buyer_wallet',
      'builder_wallet',
      'platform_revenue',
      'escrow_hold',
      'external'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_event_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_event_type AS ENUM (
      'payment_captured',
      'escrow_funded',
      'escrow_released',
      'escrow_frozen',
      'escrow_unfrozen',
      'refund_requested',
      'refund_completed',
      'payout_created',
      'payout_completed',
      'withdrawal_requested',
      'withdrawal_completed',
      'dispute_opened',
      'dispute_settled',
      'reconciliation_started',
      'reconciliation_completed',
      'ledger_entry_recorded'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_escrow_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_escrow_status AS ENUM (
      'pending',
      'funded',
      'frozen',
      'released',
      'refunded',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_refund_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_refund_status AS ENUM (
      'requested',
      'processing',
      'completed',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_payout_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_payout_status AS ENUM (
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_dispute_settlement_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_dispute_settlement_status AS ENUM (
      'pending',
      'in_review',
      'settled_buyer',
      'settled_builder',
      'split',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finance_reconciliation_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.finance_reconciliation_status AS ENUM (
      'pending',
      'running',
      'completed',
      'failed'
    );
  END IF;
END $$;

-- ── APPEND-ONLY GUARD ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.finance_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % operations are not permitted', TG_TABLE_NAME, TG_OP;
END;
$$;

-- ── finance_ledger_entries ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type public.finance_ledger_entry_type NOT NULL,
  direction public.finance_direction NOT NULL,
  account_type public.finance_account_type NOT NULL,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  builder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  collab_id uuid REFERENCES public.collabs(id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  refund_request_id uuid REFERENCES public.refund_requests(id) ON DELETE SET NULL,
  withdrawal_id uuid REFERENCES public.builder_withdrawals(id) ON DELETE SET NULL,
  dispute_id uuid REFERENCES public.disputes(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'USD',
  gross_amount_usd numeric(14, 4) NOT NULL DEFAULT 0 CHECK (gross_amount_usd >= 0),
  platform_fee_usd numeric(14, 4) NOT NULL DEFAULT 0 CHECK (platform_fee_usd >= 0),
  tax_amount_usd numeric(14, 4) NOT NULL DEFAULT 0 CHECK (tax_amount_usd >= 0),
  net_amount_usd numeric(14, 4) NOT NULL CHECK (net_amount_usd >= 0),
  payment_provider text,
  provider_reference text,
  idempotency_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_ledger_entries_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_finance_ledger_entries_created_at
  ON public.finance_ledger_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_ledger_entries_builder_id
  ON public.finance_ledger_entries(builder_id, created_at DESC)
  WHERE builder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ledger_entries_buyer_id
  ON public.finance_ledger_entries(buyer_id, created_at DESC)
  WHERE buyer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ledger_entries_transaction_id
  ON public.finance_ledger_entries(transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ledger_entries_collab_id
  ON public.finance_ledger_entries(collab_id, created_at DESC)
  WHERE collab_id IS NOT NULL;

DROP TRIGGER IF EXISTS finance_ledger_entries_deny_update ON public.finance_ledger_entries;
CREATE TRIGGER finance_ledger_entries_deny_update
  BEFORE UPDATE ON public.finance_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.finance_deny_mutation();

DROP TRIGGER IF EXISTS finance_ledger_entries_deny_delete ON public.finance_ledger_entries;
CREATE TRIGGER finance_ledger_entries_deny_delete
  BEFORE DELETE ON public.finance_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.finance_deny_mutation();

ALTER TABLE public.finance_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read finance ledger entries" ON public.finance_ledger_entries;
CREATE POLICY "Admins can read finance ledger entries"
  ON public.finance_ledger_entries FOR SELECT
  USING (public.is_platform_admin());

-- ── finance_events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.finance_event_type NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  builder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  collab_id uuid REFERENCES public.collabs(id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  refund_request_id uuid REFERENCES public.refund_requests(id) ON DELETE SET NULL,
  withdrawal_id uuid REFERENCES public.builder_withdrawals(id) ON DELETE SET NULL,
  dispute_id uuid REFERENCES public.disputes(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_events_created_at
  ON public.finance_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_events_event_type
  ON public.finance_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_events_collab_id
  ON public.finance_events(collab_id, created_at DESC)
  WHERE collab_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_events_transaction_id
  ON public.finance_events(transaction_id)
  WHERE transaction_id IS NOT NULL;

DROP TRIGGER IF EXISTS finance_events_deny_update ON public.finance_events;
CREATE TRIGGER finance_events_deny_update
  BEFORE UPDATE ON public.finance_events
  FOR EACH ROW EXECUTE FUNCTION public.finance_deny_mutation();

DROP TRIGGER IF EXISTS finance_events_deny_delete ON public.finance_events;
CREATE TRIGGER finance_events_deny_delete
  BEFORE DELETE ON public.finance_events
  FOR EACH ROW EXECUTE FUNCTION public.finance_deny_mutation();

ALTER TABLE public.finance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read finance events" ON public.finance_events;
CREATE POLICY "Admins can read finance events"
  ON public.finance_events FOR SELECT
  USING (public.is_platform_admin());

-- ── finance_payouts ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  gross_amount numeric(14, 4) NOT NULL CHECK (gross_amount >= 0),
  platform_fee numeric(14, 4) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  net_amount numeric(14, 4) NOT NULL CHECK (net_amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status public.finance_payout_status NOT NULL DEFAULT 'pending',
  payment_method text,
  reference text,
  notes text,
  processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_payouts_builder_id
  ON public.finance_payouts(builder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_payouts_status
  ON public.finance_payouts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_payouts_invoice_id
  ON public.finance_payouts(invoice_id)
  WHERE invoice_id IS NOT NULL;

ALTER TABLE public.finance_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read finance payouts" ON public.finance_payouts;
CREATE POLICY "Admins can read finance payouts"
  ON public.finance_payouts FOR SELECT
  USING (public.is_platform_admin());

-- ── finance_reconciliation_runs ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.finance_reconciliation_status NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_runs_status
  ON public.finance_reconciliation_runs(status, started_at DESC);

ALTER TABLE public.finance_reconciliation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read finance reconciliation runs" ON public.finance_reconciliation_runs;
CREATE POLICY "Admins can read finance reconciliation runs"
  ON public.finance_reconciliation_runs FOR SELECT
  USING (public.is_platform_admin());

-- ── finance_reconciliation_items ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.finance_reconciliation_runs(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  ledger_entry_id uuid REFERENCES public.finance_ledger_entries(id) ON DELETE SET NULL,
  status public.finance_reconciliation_status NOT NULL DEFAULT 'pending',
  difference numeric(14, 4) NOT NULL DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_items_run_id
  ON public.finance_reconciliation_items(run_id);

CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_items_transaction_id
  ON public.finance_reconciliation_items(transaction_id)
  WHERE transaction_id IS NOT NULL;

ALTER TABLE public.finance_reconciliation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read finance reconciliation items" ON public.finance_reconciliation_items;
CREATE POLICY "Admins can read finance reconciliation items"
  ON public.finance_reconciliation_items FOR SELECT
  USING (public.is_platform_admin());