ALTER TABLE collabs
  ADD COLUMN IF NOT EXISTS proposal_platform_fee_charged boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN collabs.proposal_platform_fee_charged IS
  'True after the one-time $5 platform fee has been charged on original (proposal) milestones.';

-- Backfill: if any original milestone was funded with a fee transaction, mark as charged
UPDATE collabs c
SET proposal_platform_fee_charged = true
WHERE EXISTS (
  SELECT 1
  FROM milestones m
  JOIN transactions t ON t.item_id = m.id
  WHERE m.collab_id = c.id
    AND COALESCE(m.is_new_milestone, false) = false
    AND m.status IN ('funded', 'in_progress', 'submitted', 'approved', 'released', 'completed')
    AND t.transaction_type IN ('collab_milestone', 'escrow_funding', 'milestone_funding')
    AND t.status = 'completed'
    AND COALESCE(t.fee_usd, 0) >= 5
);
