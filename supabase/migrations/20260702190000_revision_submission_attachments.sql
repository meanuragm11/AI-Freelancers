-- Support multi-file revision submissions on deliverables
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.deliverables.attachments IS
  'Array of {name, url, type, size} objects uploaded with milestone/revision submission';
