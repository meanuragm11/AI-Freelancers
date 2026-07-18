-- Buyer Activity Publishing System — production improvements

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requires_founder_publish_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_publish_approval_at timestamptz,
  ADD COLUMN IF NOT EXISTS founder_publish_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.buyer_marketplace_limits
  ADD COLUMN IF NOT EXISTS requires_founder_publish_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_publish_approval_at timestamptz;

CREATE TABLE IF NOT EXISTS public.buyer_inactivity_restriction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  archive_rate numeric(5,4),
  published_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_buyer_inactivity_restriction_events_buyer
  ON public.buyer_inactivity_restriction_events(buyer_id, applied_at DESC);

ALTER TABLE public.project_hiring_activities
  ADD COLUMN IF NOT EXISTS qualifies_activity boolean NOT NULL DEFAULT true;

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
    OR NEW.requires_founder_publish_approval IS DISTINCT FROM OLD.requires_founder_publish_approval
    OR NEW.founder_publish_approval_at IS DISTINCT FROM OLD.founder_publish_approval_at
    OR NEW.founder_publish_approved_by IS DISTINCT FROM OLD.founder_publish_approved_by
  THEN
    RAISE EXCEPTION 'Cannot modify privileged profile fields directly';
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.buyer_inactivity_restriction_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers view own restriction events" ON public.buyer_inactivity_restriction_events;
CREATE POLICY "Buyers view own restriction events"
  ON public.buyer_inactivity_restriction_events FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);
