-- Add payment_type field to project_requests and create negotiation history table
-- Applied to support Single Payment and Milestone Payment workflows

-- Add payment_type field to project_requests
ALTER TABLE public.project_requests
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'single_payment'
  CHECK (payment_type IN ('single_payment', 'milestone_payment'));

-- Add agreed_amount field to track final negotiated amount
ALTER TABLE public.project_requests
  ADD COLUMN IF NOT EXISTS agreed_amount_usd numeric(10,2);

-- Add negotiation_round field to track negotiation iterations
ALTER TABLE public.project_requests
  ADD COLUMN IF NOT EXISTS negotiation_round integer DEFAULT 0;

-- Create negotiation_history table for audit trail
CREATE TABLE IF NOT EXISTS public.negotiation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_request_id uuid NOT NULL REFERENCES public.project_requests(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposal_type text NOT NULL CHECK (proposal_type IN ('initial', 'counter_offer', 'accept', 'reject')),
  proposed_amount_usd numeric(10,2),
  proposed_milestones jsonb DEFAULT '[]'::jsonb,
  explanation text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for negotiation_history
CREATE INDEX IF NOT EXISTS idx_negotiation_history_project_request ON public.negotiation_history(project_request_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_history_proposed_by ON public.negotiation_history(proposed_by);
CREATE INDEX IF NOT EXISTS idx_negotiation_history_status ON public.negotiation_history(status);

-- Enable RLS on negotiation_history
ALTER TABLE public.negotiation_history ENABLE ROW LEVEL SECURITY;

-- Policy: Participants can read negotiation history for their requests
DROP POLICY IF EXISTS "Participants can read negotiation history" ON public.negotiation_history;
CREATE POLICY "Participants can read negotiation history"
  ON public.negotiation_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_requests pr
      WHERE pr.id = negotiation_history.project_request_id
        AND (pr.buyer_id = auth.uid() OR pr.builder_id = auth.uid())
    )
  );

-- Policy: Buyers and builders can insert negotiation history
DROP POLICY IF EXISTS "Participants can insert negotiation history" ON public.negotiation_history;
CREATE POLICY "Participants can insert negotiation history"
  ON public.negotiation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_requests pr
      WHERE pr.id = negotiation_history.project_request_id
        AND (pr.buyer_id = auth.uid() OR pr.builder_id = auth.uid())
    )
    AND proposed_by = auth.uid()
  );

-- Add cumulative_new_milestones_fee_charged field to track if platform fee was charged for additional milestones
ALTER TABLE public.collabs
  ADD COLUMN IF NOT EXISTS cumulative_new_milestones_fee_charged boolean DEFAULT false;

-- Add new_milestones_total field to track total value of newly added milestones
ALTER TABLE public.collabs
  ADD COLUMN IF NOT EXISTS new_milestones_total_usd numeric(10,2) DEFAULT 0;
