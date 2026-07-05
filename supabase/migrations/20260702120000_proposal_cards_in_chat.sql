-- Proposal cards in chat: snapshots and funded status

ALTER TABLE public.project_requests
  DROP CONSTRAINT IF EXISTS project_requests_status_check;

ALTER TABLE public.project_requests
  ADD CONSTRAINT project_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'negotiating', 'quoted', 'completed', 'funded'));

ALTER TABLE public.negotiation_history
  ADD COLUMN IF NOT EXISTS proposal_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.project_requests
  ADD COLUMN IF NOT EXISTS accepted_negotiation_id uuid REFERENCES public.negotiation_history(id) ON DELETE SET NULL;
