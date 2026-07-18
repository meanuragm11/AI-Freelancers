-- Fix: allow manual split entry (no forced 50/50 backfill)
-- Run if 20260718100000 failed at disputes_split_pct_check

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_one_active_per_collab
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
