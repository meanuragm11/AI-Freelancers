-- PHASE 3A: Account Moderation.
--
-- Adds a four-tier moderation model to profiles:
--   - active            : no restrictions.
--   - suspended / soft   : cannot publish new listings or accept new work;
--                          existing active projects, messaging, and withdrawals continue.
--   - suspended / financial_hold : withdrawals are frozen; everything else continues.
--   - suspended / full   : all new marketplace activity is blocked (publish, accept
--                          work, withdraw, messaging); existing data is preserved.
--   - banned            : account fully disabled (Supabase Auth login revoked via
--                          ban_duration) and blocked everywhere; historical data kept.
--
-- Enforcement is defense-in-depth:
--   1. `public.profile_can(uid, action)` is the single source of truth for the gate.
--   2. RLS WITH CHECK clauses on services/components (publish), messages (send), and
--      collabs (accept new work) call it directly, so it holds even if application
--      code is bypassed.
--   3. `request_builder_withdrawal()` (SECURITY DEFINER RPC) is updated to call it too.
--   4. A BEFORE UPDATE trigger on profiles prevents the account owner (or anyone
--      without is_platform_admin()) from writing to the moderation columns (or other
--      already-privileged columns) directly -- closing a pre-existing gap where
--      "Users can update own profile" had no column restriction at all.

-- ── Schema ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned')),
  ADD COLUMN IF NOT EXISTS suspension_type text
    CHECK (suspension_type IN ('soft', 'financial_hold', 'full')),
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspension_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reinstated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reinstated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_suspension_type_requires_suspended;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_suspension_type_requires_suspended
  CHECK (
    (account_status = 'suspended' AND suspension_type IS NOT NULL)
    OR (account_status <> 'suspended' AND suspension_type IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_profiles_account_status
  ON public.profiles(account_status)
  WHERE account_status <> 'active';

-- ── Single source of truth for enforcement ──
-- p_action: 'publish' | 'accept_work' | 'withdraw' | 'message' | 'engage'
CREATE OR REPLACE FUNCTION public.profile_can(p_user_id uuid, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE p_action
        WHEN 'publish' THEN
          NOT (p.account_status = 'banned' OR (p.account_status = 'suspended' AND p.suspension_type IN ('soft', 'full')))
        WHEN 'accept_work' THEN
          NOT (p.account_status = 'banned' OR (p.account_status = 'suspended' AND p.suspension_type IN ('soft', 'full')))
        WHEN 'withdraw' THEN
          NOT (p.account_status = 'banned' OR (p.account_status = 'suspended' AND p.suspension_type IN ('financial_hold', 'full')))
        WHEN 'message' THEN
          NOT (p.account_status = 'banned' OR (p.account_status = 'suspended' AND p.suspension_type = 'full'))
        WHEN 'engage' THEN
          NOT (p.account_status = 'banned' OR (p.account_status = 'suspended' AND p.suspension_type = 'full'))
        ELSE true
      END
      FROM public.profiles p
      WHERE p.id = p_user_id
    ),
    true
  );
$$;

REVOKE ALL ON FUNCTION public.profile_can(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_can(uuid, text) TO authenticated, service_role;

-- ── Protect privileged profile columns from self-service edits ──
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
  THEN
    RAISE EXCEPTION 'Cannot modify privileged profile fields directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- ── Enforce at RLS: publishing services/components ──
DROP POLICY IF EXISTS services_builder_insert ON public.services;
CREATE POLICY services_builder_insert
  ON public.services
  FOR INSERT
  WITH CHECK (
    builder_id = auth.uid()
    AND (status IS DISTINCT FROM 'published' OR public.profile_can(auth.uid(), 'publish'))
  );

DROP POLICY IF EXISTS services_builder_update ON public.services;
CREATE POLICY services_builder_update
  ON public.services
  FOR UPDATE
  USING (builder_id = auth.uid())
  WITH CHECK (
    builder_id = auth.uid()
    AND (status IS DISTINCT FROM 'published' OR public.profile_can(auth.uid(), 'publish'))
  );

DROP POLICY IF EXISTS "Builders can insert components" ON public.components;
CREATE POLICY "Builders can insert components"
  ON public.components
  FOR INSERT
  WITH CHECK (
    auth.uid() = builder_id
    AND (status IS DISTINCT FROM 'published' OR public.profile_can(auth.uid(), 'publish'))
  );

DROP POLICY IF EXISTS "Builders can update own components" ON public.components;
CREATE POLICY "Builders can update own components"
  ON public.components
  FOR UPDATE
  USING (auth.uid() = builder_id)
  WITH CHECK (
    auth.uid() = builder_id
    AND (status IS DISTINCT FROM 'published' OR public.profile_can(auth.uid(), 'publish'))
  );

-- ── Enforce at RLS: sending new messages ──
DROP POLICY IF EXISTS "Users can insert collab messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to their collabs" ON public.messages;
CREATE POLICY "Users can insert collab messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.profile_can(auth.uid(), 'message')
    AND EXISTS (
      SELECT 1 FROM public.collabs
      WHERE collabs.id = messages.collab_id
        AND (collabs.buyer_id = auth.uid() OR collabs.builder_id = auth.uid())
    )
  );

-- ── Enforce at RLS: starting brand-new engagements ──
DROP POLICY IF EXISTS "Buyers can insert collabs" ON public.collabs;
CREATE POLICY "Buyers can insert collabs"
  ON public.collabs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND public.profile_can(auth.uid(), 'engage'));

DROP POLICY IF EXISTS "Builders can insert collabs" ON public.collabs;
CREATE POLICY "Builders can insert collabs"
  ON public.collabs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = builder_id AND public.profile_can(auth.uid(), 'accept_work'));

-- ── Enforce at the withdrawal RPC ──
CREATE OR REPLACE FUNCTION public.request_builder_withdrawal(
  p_builder_id uuid,
  p_amount_usd numeric,
  p_reference_code text,
  p_payout_method_id uuid
)
RETURNS public.builder_withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_payout public.builder_payout_methods%ROWTYPE;
  v_lifetime numeric;
  v_reserved numeric;
  v_available numeric;
  v_row public.builder_withdrawals%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_builder_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_builder_id::text, 0));

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_builder_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF NOT public.profile_can(p_builder_id, 'withdraw') THEN
    RAISE EXCEPTION 'Withdrawals are currently disabled for this account';
  END IF;

  IF COALESCE(v_profile.kyc_status, '') <> 'verified' AND v_profile.is_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'KYC verification required before withdrawing funds';
  END IF;

  IF v_profile.payouts_enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'Payouts are not enabled for this account';
  END IF;

  SELECT * INTO v_payout
  FROM public.builder_payout_methods
  WHERE id = p_payout_method_id
    AND builder_id = p_builder_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connect a bank account before withdrawing funds';
  END IF;

  v_lifetime := public.compute_builder_lifetime_earnings_usd(p_builder_id);

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_reserved
  FROM public.builder_withdrawals
  WHERE builder_id = p_builder_id
    AND status IN ('requested', 'pending_review', 'approved', 'processing', 'completed');

  v_available := GREATEST(0, v_lifetime - v_reserved);

  IF p_amount_usd > v_available THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %', v_available;
  END IF;

  INSERT INTO public.builder_withdrawals (
    builder_id,
    payout_method_id,
    amount_usd,
    status,
    reference_code
  )
  VALUES (
    p_builder_id,
    p_payout_method_id,
    p_amount_usd,
    'requested',
    p_reference_code
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.request_builder_withdrawal(uuid, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_builder_withdrawal(uuid, numeric, text, uuid) TO authenticated, service_role;

-- ── Auto-archive published listings when a builder is soft/full-suspended or banned ──
-- (Called by the founder moderation API via service role; also safe to run standalone.)
CREATE OR REPLACE FUNCTION public.archive_builder_published_listings(p_builder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.services
    SET status = 'archived'
    WHERE builder_id = p_builder_id AND status = 'published';

  UPDATE public.components
    SET status = 'archived'
    WHERE builder_id = p_builder_id AND status = 'published';
END;
$$;

REVOKE ALL ON FUNCTION public.archive_builder_published_listings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_builder_published_listings(uuid) TO service_role;
