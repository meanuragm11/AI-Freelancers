-- Phase 3C: expand admin_audit_log with structured before/after diffs, and add
-- an immutable business_events ledger (platform-wide timeline of key actions:
-- payments, escrow, disputes, withdrawals, refunds, moderation).

-- ── Expand admin_audit_log ──
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS previous_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value jsonb;

-- ── business_events: immutable platform timeline ──
CREATE TABLE IF NOT EXISTS public.business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN (
    'collab', 'transaction', 'dispute', 'support_ticket', 'withdrawal', 'refund_request', 'profile'
  )),
  entity_id uuid,
  collab_id uuid REFERENCES public.collabs(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_usd numeric,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_events_entity ON public.business_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_collab ON public.business_events(collab_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_created_at ON public.business_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_type ON public.business_events(event_type, created_at DESC);

ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read business events" ON public.business_events;
CREATE POLICY "Admins can read business events"
  ON public.business_events FOR SELECT
  USING (public.is_platform_admin());

-- Inserts happen exclusively via the service role from server-side code paths;
-- no INSERT/UPDATE/DELETE policy is granted to any other role, making the
-- ledger effectively append-only and immutable from the client.
