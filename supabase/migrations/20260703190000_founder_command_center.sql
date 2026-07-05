-- Founder Command Center: admin audit log, internal notes, dispute resolution fields,
-- support ticket assignment, and admin RLS policies across operational tables.

-- ── Helper: single source of truth for "is this caller a founder/admin" ──
CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = uid),
    false
  );
$$;

-- ── Audit log: every founder/admin mutation is recorded here ──
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_platform_admin());

-- Inserts happen exclusively via the service role from server-side API routes.

-- ── Internal notes: admin-only annotations on any entity, never customer-visible ──
CREATE TABLE IF NOT EXISTS public.admin_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('user', 'dispute', 'support_ticket', 'payment')),
  entity_id text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_internal_notes_entity
  ON public.admin_internal_notes(entity_type, entity_id, created_at DESC);

ALTER TABLE public.admin_internal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage internal notes" ON public.admin_internal_notes;
CREATE POLICY "Admins can manage internal notes"
  ON public.admin_internal_notes FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ── Support ticket assignment ──
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);

-- ── Dispute resolution metadata ──
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_type text
    CHECK (resolution_type IN ('buyer_favor', 'freelancer_favor', 'split', 'other'));

-- ── Fast admin lookups ──
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(id) WHERE is_admin = true;

-- ── Admin read/manage policies across operational tables (defense-in-depth; ──
-- ── founder API routes use the service role, but these policies keep the ──
-- ── data model consistent with the existing support_tickets convention.) ──

DROP POLICY IF EXISTS "Admins can manage disputes" ON public.disputes;
CREATE POLICY "Admins can manage disputes"
  ON public.disputes FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage dispute timeline" ON public.dispute_timeline_entries;
CREATE POLICY "Admins can manage dispute timeline"
  ON public.dispute_timeline_entries FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read dispute evidence" ON public.dispute_evidence;
CREATE POLICY "Admins can read dispute evidence"
  ON public.dispute_evidence FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage escrow transactions" ON public.escrow_transactions;
CREATE POLICY "Admins can manage escrow transactions"
  ON public.escrow_transactions FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all transactions" ON public.transactions;
CREATE POLICY "Admins can read all transactions"
  ON public.transactions FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.builder_withdrawals;
CREATE POLICY "Admins can manage withdrawals"
  ON public.builder_withdrawals FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read payout methods" ON public.builder_payout_methods;
CREATE POLICY "Admins can read payout methods"
  ON public.builder_payout_methods FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all collabs" ON public.collabs;
CREATE POLICY "Admins can read all collabs"
  ON public.collabs FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all milestones" ON public.milestones;
CREATE POLICY "Admins can read all milestones"
  ON public.milestones FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all project milestones" ON public.project_milestones;
CREATE POLICY "Admins can read all project milestones"
  ON public.project_milestones FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all deliverables" ON public.deliverables;
CREATE POLICY "Admins can read all deliverables"
  ON public.deliverables FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all revision requests" ON public.revision_requests;
CREATE POLICY "Admins can read all revision requests"
  ON public.revision_requests FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage components" ON public.components;
CREATE POLICY "Admins can manage components"
  ON public.components FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all project requests" ON public.project_requests;
CREATE POLICY "Admins can read all project requests"
  ON public.project_requests FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all quotations" ON public.quotations;
CREATE POLICY "Admins can read all quotations"
  ON public.quotations FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all reviews" ON public.reviews;
CREATE POLICY "Admins can read all reviews"
  ON public.reviews FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all messages" ON public.messages;
CREATE POLICY "Admins can read all messages"
  ON public.messages FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all negotiation history" ON public.negotiation_history;
CREATE POLICY "Admins can read all negotiation history"
  ON public.negotiation_history FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all invoices" ON public.invoices;
CREATE POLICY "Admins can read all invoices"
  ON public.invoices FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage system alerts" ON public.system_alerts;
CREATE POLICY "Admins can manage system alerts"
  ON public.system_alerts FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all library entries" ON public.library;
CREATE POLICY "Admins can read all library entries"
  ON public.library FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all portfolio projects" ON public.portfolio_projects;
CREATE POLICY "Admins can read all portfolio projects"
  ON public.portfolio_projects FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
