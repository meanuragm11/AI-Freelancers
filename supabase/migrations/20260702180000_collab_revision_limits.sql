-- Revision limits on collabs (may already exist in remote; safe to re-run)
ALTER TABLE public.collabs
  ADD COLUMN IF NOT EXISTS max_revisions integer,
  ADD COLUMN IF NOT EXISTS revisions_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_revision_price_usd numeric(10,2);

-- Snapshot extra revision price from linked services
UPDATE public.collabs c
SET extra_revision_price_usd = s.extra_revision_price_usd
FROM public.services s
WHERE c.service_id = s.id
  AND c.extra_revision_price_usd IS NULL;

-- Align max_revisions with service included_revisions where not yet customized
UPDATE public.collabs c
SET max_revisions = s.included_revisions
FROM public.services s
WHERE c.service_id = s.id
  AND (c.max_revisions IS NULL OR c.max_revisions = 2);

-- Backfill revisions_used from existing revision_requests
UPDATE public.collabs c
SET revisions_used = sub.cnt
FROM (
  SELECT collab_id, COUNT(*)::integer AS cnt
  FROM public.revision_requests
  GROUP BY collab_id
) sub
WHERE c.id = sub.collab_id
  AND c.revisions_used < sub.cnt;

COMMENT ON COLUMN public.collabs.max_revisions IS 'Included free revisions for this collab (from service or quotation at purchase)';
COMMENT ON COLUMN public.collabs.revisions_used IS 'Number of revision requests consumed by the buyer';
COMMENT ON COLUMN public.collabs.extra_revision_price_usd IS 'Price per extra revision beyond max_revisions, snapshotted at purchase';
