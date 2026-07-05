-- Add is_new_milestone field to milestones table
-- Applied to support dynamic milestone addition during active projects

ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS is_new_milestone boolean DEFAULT false;

-- Add index for filtering new milestones
CREATE INDEX IF NOT EXISTS idx_milestones_is_new ON public.milestones(is_new_milestone);
