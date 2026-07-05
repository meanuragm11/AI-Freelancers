-- PHASE 3B: Refund Architecture.
--
-- A real refund ledger replacing the "derive pending/approved refunds from disputes"
-- placeholder in /founder/payments. Workflow:
--   buyer requests -> builder responds (accept/contest, informational) -> founder
--   reviews -> approve (triggers a real Razorpay refund) or reject.
-- Every request is tied to exactly one captured transaction/payment, so the
-- Razorpay refund call always has an unambiguous payment_id + bounded amount.
-- This is intentionally NOT a one-click auto-refund: founder approval is always
-- required before money moves, regardless of what the builder said.

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id uuid NOT NULL REFERENCES public.collabs(id) ON DELETE RESTRICT,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  dispute_id uuid REFERENCES public.disputes(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  refund_type text NOT NULL CHECK (refund_type IN ('full', 'partial', 'milestone', 'custom_settlement')),
  requested_amount_usd numeric NOT NULL CHECK (requested_amount_usd > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN (
      'requested',
      'builder_responded',
      'founder_review',
      'approved',
      'rejected',
      'processing',
      'completed',
      'failed',
      'cancelled'
    )),
  builder_response text,
  builder_response_type text CHECK (builder_response_type IN ('accept', 'contest')),
  builder_responded_at timestamptz,
  founder_decision_amount_usd numeric CHECK (founder_decision_amount_usd IS NULL OR founder_decision_amount_usd > 0),
  founder_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  razorpay_refund_id text,
  processed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_collab ON public.refund_requests(collab_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_requests_buyer ON public.refund_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_builder ON public.refund_requests(builder_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_transaction ON public.refund_requests(transaction_id);

-- Only one non-terminal refund request per transaction at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_requests_one_active_per_transaction
  ON public.refund_requests(transaction_id)
  WHERE status NOT IN ('rejected', 'completed', 'failed', 'cancelled');

CREATE OR REPLACE FUNCTION public.touch_refund_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_refund_request_updated_at_trigger ON public.refund_requests;
CREATE TRIGGER touch_refund_request_updated_at_trigger
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_refund_request_updated_at();

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can read own refund requests" ON public.refund_requests;
CREATE POLICY "Buyers can read own refund requests"
  ON public.refund_requests FOR SELECT
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Builders can read own refund requests" ON public.refund_requests;
CREATE POLICY "Builders can read own refund requests"
  ON public.refund_requests FOR SELECT
  USING (auth.uid() = builder_id);

DROP POLICY IF EXISTS "Buyers can create refund requests" ON public.refund_requests;
CREATE POLICY "Buyers can create refund requests"
  ON public.refund_requests FOR INSERT
  WITH CHECK (auth.uid() = buyer_id AND auth.uid() = requested_by AND status = 'requested');

DROP POLICY IF EXISTS "Admins can manage refund requests" ON public.refund_requests;
CREATE POLICY "Admins can manage refund requests"
  ON public.refund_requests FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Builder response is applied through a guarded RPC rather than a raw UPDATE so
-- founder-only fields (status transitions beyond founder_review, amounts, refund
-- ids) can never be touched by a builder's own row-owner UPDATE grant.
CREATE OR REPLACE FUNCTION public.respond_to_refund_request(
  p_refund_id uuid,
  p_response_type text,
  p_response text
)
RETURNS public.refund_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.refund_requests%ROWTYPE;
BEGIN
  IF p_response_type NOT IN ('accept', 'contest') THEN
    RAISE EXCEPTION 'Invalid response type';
  END IF;

  SELECT * INTO v_row FROM public.refund_requests WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund request not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_row.builder_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_row.status <> 'requested' THEN
    RAISE EXCEPTION 'This refund request has already been responded to';
  END IF;

  UPDATE public.refund_requests
    SET status = 'founder_review',
        builder_response = p_response,
        builder_response_type = p_response_type,
        builder_responded_at = now()
    WHERE id = p_refund_id
    RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_refund_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_refund_request(uuid, text, text) TO authenticated, service_role;
