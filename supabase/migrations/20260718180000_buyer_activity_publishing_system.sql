-- Buyer Activity-Based Publishing System & Verified Buyer Program

-- ─── Extend project status ────────────────────────────────────────────────────

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'draft', 'published', 'receiving_proposals', 'negotiating',
    'closed', 'hired', 'cancelled', 'archived'
  ));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS monitoring_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS activity_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS long_term_archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS activity_reminder_1_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS activity_reminder_2_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_projects_monitoring
  ON public.projects(monitoring_started_at)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_archived_at
  ON public.projects(archived_at)
  WHERE status = 'archived' AND deleted_at IS NULL;

-- ─── Buyer profile flags ──────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_buyer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_buyer_at timestamptz,
  ADD COLUMN IF NOT EXISTS inactive_buyer_restricted_until timestamptz,
  ADD COLUMN IF NOT EXISTS inactive_buyer_restriction_started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_verified_buyer
  ON public.profiles(verified_buyer)
  WHERE verified_buyer = true;

CREATE INDEX IF NOT EXISTS idx_profiles_inactive_restriction
  ON public.profiles(inactive_buyer_restricted_until)
  WHERE inactive_buyer_restricted_until IS NOT NULL;

-- ─── Extend buyer_marketplace_limits ─────────────────────────────────────────

ALTER TABLE public.buyer_marketplace_limits
  ADD COLUMN IF NOT EXISTS verified_buyer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_buyer_at timestamptz,
  ADD COLUMN IF NOT EXISTS inactive_restriction_until timestamptz,
  ADD COLUMN IF NOT EXISTS inactive_restriction_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS active_public_project_count integer NOT NULL DEFAULT 0;

-- ─── Hiring activity audit trail ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_hiring_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL
    CHECK (action_type IN (
      'message_proposer', 'shortlist_proposal', 'invite_freelancer',
      'start_negotiation', 'hire'
    )),
  target_id uuid,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_hiring_activities_project
  ON public.project_hiring_activities(project_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_hiring_activities_dedup
  ON public.project_hiring_activities(project_id, action_type, COALESCE(target_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ─── Expose verified_buyer on public profile view ─────────────────────────────

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  full_name,
  role,
  company_name,
  created_at,
  reputation_score,
  is_verified,
  verified_buyer,
  platform_role,
  is_freelancer,
  base_price_usd,
  included_revisions,
  extra_revision_price_usd,
  unlimited_revisions,
  external_projects,
  headline,
  location,
  bio,
  tech_stack,
  avatar_url,
  banner_url,
  delivery_time_days,
  languages,
  completed_projects,
  average_rating,
  review_count,
  average_response_hours,
  is_top_expert,
  last_active_at,
  availability_status,
  profile_views
FROM public.profiles;

COMMENT ON VIEW public.profiles_public IS
  'Marketplace-safe public projection of profiles (SECURITY INVOKER). Never add is_admin, kyc_status, stripe_account_id, payment_routing_id, payouts_enabled, total_earnings_usd, support_email, pending_verification, or moderation columns to this view.';

GRANT SELECT ON public.profiles_public TO anon, authenticated;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id,
  full_name,
  role,
  company_name,
  created_at,
  reputation_score,
  is_verified,
  verified_buyer,
  platform_role,
  is_freelancer,
  base_price_usd,
  included_revisions,
  extra_revision_price_usd,
  unlimited_revisions,
  external_projects,
  headline,
  location,
  bio,
  tech_stack,
  avatar_url,
  banner_url,
  delivery_time_days,
  languages,
  completed_projects,
  average_rating,
  review_count,
  average_response_hours,
  is_top_expert,
  last_active_at,
  availability_status,
  profile_views
) ON public.profiles TO anon;

-- ─── Protect verified_buyer from self-service edits ───────────────────────────

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.account_status IS DISTINCT FROM OLD.account_status
    OR NEW.suspension_type IS DISTINCT FROM OLD.suspension_type
    OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
    OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
    OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
    OR NEW.suspension_expires_at IS DISTINCT FROM OLD.suspension_expires_at
    OR NEW.reinstated_at IS DISTINCT FROM OLD.reinstated_at
    OR NEW.reinstated_by IS DISTINCT FROM OLD.reinstated_by
    OR NEW.payouts_enabled IS DISTINCT FROM OLD.payouts_enabled
    OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
    OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
    OR NEW.verified_buyer IS DISTINCT FROM OLD.verified_buyer
    OR NEW.verified_buyer_at IS DISTINCT FROM OLD.verified_buyer_at
    OR NEW.inactive_buyer_restricted_until IS DISTINCT FROM OLD.inactive_buyer_restricted_until
    OR NEW.inactive_buyer_restriction_started_at IS DISTINCT FROM OLD.inactive_buyer_restriction_started_at
  THEN
    RAISE EXCEPTION 'Cannot modify privileged profile fields directly';
  END IF;

  RETURN NEW;
END;
$$;

-- ─── RLS for hiring activities ────────────────────────────────────────────────

ALTER TABLE public.project_hiring_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers view own project hiring activities" ON public.project_hiring_activities;
CREATE POLICY "Buyers view own project hiring activities"
  ON public.project_hiring_activities FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);
