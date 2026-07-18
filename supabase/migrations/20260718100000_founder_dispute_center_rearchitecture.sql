-- Founder Dispute Center re-architecture: lifecycle statuses, decision fields,
-- payment execution tracking, and list RPC.

-- ── Drop legacy status constraint and migrate rows ──
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;

UPDATE public.disputes
SET status = CASE
  WHEN status IN ('waiting_for_freelancer', 'waiting_for_buyer', 'negotiation') THEN 'open'
  WHEN status IN ('under_review', 'arbitration_requested') THEN 'under_investigation'
  WHEN status = 'resolved' THEN 'waiting_for_payment_execution'
  WHEN status = 'closed' THEN 'closed'
  ELSE 'open'
END;

-- ── New operational columns ──
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS decision_type text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decision_summary text NULL,
  ADD COLUMN IF NOT EXISTS buyer_split_pct numeric NULL,
  ADD COLUMN IF NOT EXISTS builder_split_pct numeric NULL,
  ADD COLUMN IF NOT EXISTS payment_execution_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decision_recorded_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS investigation_started_at timestamptz NULL;

-- Migrate legacy resolution fields into decision fields where present
UPDATE public.disputes
SET decision_summary = COALESCE(decision_summary, resolution_summary),
    decision_type = CASE
      WHEN decision_type <> 'pending' THEN decision_type
      WHEN resolution_type = 'buyer_favor' THEN 'refund_buyer'
      WHEN resolution_type = 'freelancer_favor' THEN 'release_builder'
      WHEN resolution_type = 'split' THEN 'split'
      WHEN resolution_type = 'other' THEN 'cancelled'
      ELSE 'pending'
    END,
    payment_execution_status = CASE
      WHEN status = 'closed' THEN 'completed'
      WHEN status = 'waiting_for_payment_execution' THEN 'pending'
      WHEN decision_type <> 'pending' AND status NOT IN ('open', 'under_investigation') THEN 'pending'
      ELSE payment_execution_status
    END,
    decision_recorded_at = COALESCE(decision_recorded_at, resolved_at)
WHERE resolution_summary IS NOT NULL OR resolution_type IS NOT NULL;

UPDATE public.disputes
SET investigation_started_at = COALESCE(investigation_started_at, arbitration_requested_at, updated_at)
WHERE status IN ('under_investigation', 'decision_recorded', 'waiting_for_payment_execution', 'closed');

UPDATE public.disputes
SET priority = CASE
  WHEN escrow_snapshot->>'amountUsd' IS NOT NULL AND (escrow_snapshot->>'amountUsd')::numeric >= 5000 THEN 'critical'
  WHEN primary_reason IN ('payment', 'quality') THEN 'high'
  ELSE priority
END
WHERE priority = 'medium';

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_priority_check;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_decision_type_check;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_decision_type_check
  CHECK (decision_type IN ('pending', 'refund_buyer', 'release_builder', 'split', 'cancelled'));

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_payment_execution_status_check;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_payment_execution_status_check
  CHECK (payment_execution_status IN ('pending', 'in_progress', 'completed', 'failed', 'not_required'));

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_status_check
  CHECK (status IN (
    'open',
    'under_investigation',
    'decision_recorded',
    'waiting_for_payment_execution',
    'closed'
  ));

-- Split percentages are entered manually by Founder; allow NULL until saved.
-- When set, buyer % + builder % must equal 100.

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_split_pct_check;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_split_pct_check
  CHECK (
    (decision_type <> 'split')
    OR (
      (buyer_split_pct IS NULL AND builder_split_pct IS NULL)
      OR (
        buyer_split_pct IS NOT NULL
        AND builder_split_pct IS NOT NULL
        AND buyer_split_pct >= 0
        AND builder_split_pct >= 0
        AND buyer_split_pct + builder_split_pct = 100
      )
    )
  );

DROP INDEX IF EXISTS idx_disputes_one_active_per_collab;
CREATE UNIQUE INDEX idx_disputes_one_active_per_collab
  ON public.disputes(collab_id)
  WHERE status IN (
    'open',
    'under_investigation',
    'decision_recorded',
    'waiting_for_payment_execution'
  );

CREATE INDEX IF NOT EXISTS idx_disputes_priority_created
  ON public.disputes(priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_disputes_decision_type
  ON public.disputes(decision_type);

-- ── Active dispute helper ──
CREATE OR REPLACE FUNCTION public.has_active_dispute(p_collab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.disputes d
    WHERE d.collab_id = p_collab_id
      AND d.status IN (
        'open',
        'under_investigation',
        'decision_recorded',
        'waiting_for_payment_execution'
      )
  );
$$;

-- ── Paginated founder dispute list ──
CREATE OR REPLACE FUNCTION public.founder_list_disputes(
  p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_decision text DEFAULT NULL,
  p_q text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_offset integer := (v_page - 1) * v_page_size;
  v_total bigint;
  v_rows jsonb;
BEGIN
  WITH filtered AS (
    SELECT
      d.id,
      d.collab_id,
      d.buyer_id,
      d.freelancer_id,
      d.status,
      d.priority,
      d.decision_type,
      d.primary_reason,
      d.created_at,
      d.updated_at,
      d.escrow_frozen_at,
      d.resolved_at,
      d.closed_at,
      c.title AS collab_title,
      c.escrow_amount_usd,
      c.status AS collab_status,
      bp.full_name AS buyer_name,
      fp.full_name AS freelancer_name,
      CASE WHEN d.status = 'closed' THEN 1 ELSE 0 END AS is_closed_rank,
      CASE d.priority
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END AS priority_rank
    FROM public.disputes d
    LEFT JOIN public.collabs c ON c.id = d.collab_id
    LEFT JOIN public.profiles bp ON bp.id = d.buyer_id
    LEFT JOIN public.profiles fp ON fp.id = d.freelancer_id
    WHERE (p_status IS NULL OR d.status = p_status)
      AND (
        p_priority IS NULL
        OR d.priority = p_priority
        OR (p_priority = 'critical' AND d.priority IN ('critical', 'high'))
      )
      AND (p_decision IS NULL OR d.decision_type = p_decision)
      AND (
        p_q IS NULL
        OR btrim(p_q) = ''
        OR d.id::text ILIKE '%' || btrim(p_q) || '%'
        OR d.collab_id::text ILIKE '%' || btrim(p_q) || '%'
        OR c.title ILIKE '%' || btrim(p_q) || '%'
        OR bp.full_name ILIKE '%' || btrim(p_q) || '%'
        OR fp.full_name ILIKE '%' || btrim(p_q) || '%'
      )
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM filtered
  ),
  paged AS (
    SELECT *
    FROM filtered
    ORDER BY is_closed_rank ASC, priority_rank ASC, created_at DESC
    OFFSET v_offset
    LIMIT v_page_size
  )
  SELECT
    counted.total,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'collab_id', p.collab_id,
          'buyer_id', p.buyer_id,
          'freelancer_id', p.freelancer_id,
          'status', p.status,
          'priority', p.priority,
          'decision_type', p.decision_type,
          'primary_reason', p.primary_reason,
          'created_at', p.created_at,
          'updated_at', p.updated_at,
          'escrow_frozen_at', p.escrow_frozen_at,
          'resolved_at', p.resolved_at,
          'closed_at', p.closed_at,
          'buyer', jsonb_build_object('id', p.buyer_id, 'full_name', p.buyer_name),
          'freelancer', jsonb_build_object('id', p.freelancer_id, 'full_name', p.freelancer_name),
          'collab', jsonb_build_object(
            'id', p.collab_id,
            'title', p.collab_title,
            'escrow_amount_usd', p.escrow_amount_usd,
            'status', p.collab_status
          )
        )
        ORDER BY p.is_closed_rank ASC, p.priority_rank ASC, p.created_at DESC
      ),
      '[]'::jsonb
    )
  INTO v_total, v_rows
  FROM counted
  LEFT JOIN paged p ON true
  GROUP BY counted.total;

  RETURN jsonb_build_object(
    'disputes', COALESCE(v_rows, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', v_page,
    'pageSize', v_page_size,
    'totalPages', GREATEST(CEIL(COALESCE(v_total, 0)::numeric / v_page_size), 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.founder_list_disputes(text, text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_list_disputes(text, text, text, text, integer, integer) TO service_role;
