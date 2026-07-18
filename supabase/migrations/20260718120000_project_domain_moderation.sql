-- AI domain eligibility fields for open project moderation

ALTER TABLE public.project_moderation
  ADD COLUMN IF NOT EXISTS domain text
    CHECK (domain IS NULL OR domain IN ('AI_PROJECT', 'NON_AI_PROJECT', 'AMBIGUOUS_PROJECT')),
  ADD COLUMN IF NOT EXISTS recommended_action text
    CHECK (recommended_action IS NULL OR recommended_action IN ('PUBLISH', 'FOUNDER_REVIEW', 'REJECT')),
  ADD COLUMN IF NOT EXISTS safe boolean;

CREATE INDEX IF NOT EXISTS idx_project_moderation_domain_review
  ON public.project_moderation(status, domain, created_at DESC)
  WHERE status IN ('flagged', 'pending');
