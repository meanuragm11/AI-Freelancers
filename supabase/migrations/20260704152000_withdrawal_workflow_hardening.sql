-- PHASE 2 (item 5): Real withdrawal workflow + TOCTOU-safe balance reservation.
--
-- Migration strategy:
--   1. Expand builder_withdrawals.status to the full lifecycle.
--   2. Add review metadata columns (non-breaking, nullable).
--   3. Add SQL helpers that mirror lib/builder/earningsLedger.ts lifetime math.
--   4. Add request_builder_withdrawal() RPC with advisory lock + in-transaction
--      balance check so concurrent requests cannot overdraw available balance.
--   5. Existing rows keep their current status values (processing/completed/etc.).
--
-- Apply locally:  supabase db reset   OR   supabase migration up
-- Apply remote:     supabase db push    (after reviewing diff)
-- Do NOT use apply_migration MCP for iteration — use migration files + db push.

ALTER TABLE public.builder_withdrawals DROP CONSTRAINT IF EXISTS builder_withdrawals_status_check;
ALTER TABLE public.builder_withdrawals
  ADD CONSTRAINT builder_withdrawals_status_check
  CHECK (status IN (
    'requested',
    'pending_review',
    'approved',
    'rejected',
    'processing',
    'completed',
    'failed',
    'cancelled'
  ));

ALTER TABLE public.builder_withdrawals
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Mirror TypeScript lifetime earnings (invoices + unreleased collabs + component sales).
CREATE OR REPLACE FUNCTION public.compute_builder_lifetime_earnings_usd(p_builder_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH invoice_earnings AS (
    SELECT COALESCE(SUM(net_payout_usd), 0) AS total
    FROM public.invoices
    WHERE builder_id = p_builder_id
      AND LOWER(status) IN ('paid', 'processing')
  ),
  collab_earnings AS (
    SELECT COALESCE(SUM(GREATEST(0, COALESCE(escrow_amount_usd, 0) - 5)), 0) AS total
    FROM public.collabs c
    WHERE c.builder_id = p_builder_id
      AND LOWER(c.status) IN ('completed', 'released')
      AND NOT EXISTS (
        SELECT 1 FROM public.invoices i WHERE i.collab_id = c.id
      )
  ),
  component_earnings AS (
    SELECT COALESCE(SUM(GREATEST(0, t.amount_usd - COALESCE(t.fee_usd, 0))), 0) AS total
    FROM public.transactions t
    INNER JOIN public.components comp ON comp.id = t.item_id AND comp.builder_id = p_builder_id
    WHERE t.status = 'completed'
      AND t.transaction_type = 'component_purchase'
  )
  SELECT ROUND(
    (invoice_earnings.total + collab_earnings.total + component_earnings.total)::numeric,
    2
  )
  FROM invoice_earnings, collab_earnings, component_earnings;
$$;

-- Atomically reserve balance and insert a withdrawal request.
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

REVOKE ALL ON FUNCTION public.compute_builder_lifetime_earnings_usd(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_builder_lifetime_earnings_usd(uuid) TO authenticated, service_role;
