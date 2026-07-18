-- Open Projects marketplace enhancements: limits, versions, moderation, audit

-- ─── Extend project status values ───────────────────────────────────────────

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'draft', 'published', 'receiving_proposals', 'negotiating',
    'closed', 'hired', 'cancelled'
  ));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS trust_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS duplicate_warning_acknowledged_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_moderation_status_check'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected'));
  END IF;
END $$;

-- ─── Extend proposal status values ──────────────────────────────────────────

ALTER TABLE public.project_proposals DROP CONSTRAINT IF EXISTS project_proposals_status_check;
ALTER TABLE public.project_proposals
  ADD CONSTRAINT project_proposals_status_check
  CHECK (status IN (
    'draft', 'submitted', 'pending', 'shortlisted', 'negotiating',
    'accepted', 'rejected', 'withdrawn', 'expired', 'cancelled'
  ));

ALTER TABLE public.project_proposals
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;

-- ─── Proposal version history (internal, not public) ────────────────────────

CREATE TABLE IF NOT EXISTS public.proposal_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.project_proposals(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  cover_letter text NOT NULL DEFAULT '',
  proposed_amount_usd numeric(10,2) NOT NULL,
  proposed_duration_days integer,
  payment_type text NOT NULL DEFAULT 'single_payment',
  proposed_milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  edit_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_id
  ON public.proposal_versions(proposal_id, version_number DESC);

-- ─── Builder daily activity counters ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.builder_daily_activity (
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT (CURRENT_DATE),
  proposals_submitted integer NOT NULL DEFAULT 0,
  proposals_withdrawn integer NOT NULL DEFAULT 0,
  created_at timestptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (builder_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_builder_daily_activity_date
  ON public.builder_daily_activity(activity_date);

-- ─── Buyer marketplace limits tracking ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.buyer_marketplace_limits (
  buyer_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  active_project_count integer NOT NULL DEFAULT 0,
  trust_score numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Marketplace audit logs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketplace_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL
    CHECK (entity_type IN ('project', 'proposal', 'buyer', 'builder')),
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_audit_entity
  ON public.marketplace_audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_audit_actor
  ON public.marketplace_audit_logs(actor_id, created_at DESC);

-- ─── Triggers ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.builder_daily_activity_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_builder_daily_activity_updated_at ON public.builder_daily_activity;
CREATE TRIGGER trg_builder_daily_activity_updated_at
  BEFORE UPDATE ON public.builder_daily_activity
  FOR EACH ROW EXECUTE FUNCTION public.builder_daily_activity_set_updated_at();

CREATE OR REPLACE FUNCTION public.buyer_marketplace_limits_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buyer_marketplace_limits_updated_at ON public.buyer_marketplace_limits;
CREATE TRIGGER trg_buyer_marketplace_limits_updated_at
  BEFORE UPDATE ON public.buyer_marketplace_limits
  FOR EACH ROW EXECUTE FUNCTION public.buyer_marketplace_limits_set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_marketplace_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Builders view own proposal versions" ON public.proposal_versions;
CREATE POLICY "Builders view own proposal versions"
  ON public.proposal_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_proposals pp
      WHERE pp.id = proposal_id AND pp.builder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Builders insert proposal versions" ON public.proposal_versions;
CREATE POLICY "Builders insert proposal versions"
  ON public.proposal_versions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_proposals pp
      WHERE pp.id = proposal_id AND pp.builder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Builders view own daily activity" ON public.builder_daily_activity;
CREATE POLICY "Builders view own daily activity"
  ON public.builder_daily_activity FOR SELECT TO authenticated
  USING (auth.uid() = builder_id);

DROP POLICY IF EXISTS "Buyers view own marketplace limits" ON public.buyer_marketplace_limits;
CREATE POLICY "Buyers view own marketplace limits"
  ON public.buyer_marketplace_limits FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Actors view own audit logs" ON public.marketplace_audit_logs;
CREATE POLICY "Actors view own audit logs"
  ON public.marketplace_audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = actor_id);
