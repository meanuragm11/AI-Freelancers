-- Enable Row Level Security and create policies for project_requests table
-- Applied to fix custom project request submission failures

-- Enable RLS on project_requests table
ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Buyers can insert their own project requests
DROP POLICY IF EXISTS "Buyers can insert own project requests" ON public.project_requests;
CREATE POLICY "Buyers can insert own project requests"
  ON public.project_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Policy: Builders can read project requests sent to them
DROP POLICY IF EXISTS "Builders can read own project requests" ON public.project_requests;
CREATE POLICY "Builders can read own project requests"
  ON public.project_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = builder_id);

-- Policy: Buyers can read their own project requests
DROP POLICY IF EXISTS "Buyers can read own project requests" ON public.project_requests;
CREATE POLICY "Buyers can read own project requests"
  ON public.project_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Policy: Builders can update project requests sent to them (to accept/reject)
DROP POLICY IF EXISTS "Builders can update own project requests" ON public.project_requests;
CREATE POLICY "Builders can update own project requests"
  ON public.project_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = builder_id)
  WITH CHECK (auth.uid() = builder_id);

-- Policy: Buyers can update their own project requests
DROP POLICY IF EXISTS "Buyers can update own project requests" ON public.project_requests;
CREATE POLICY "Buyers can update own project requests"
  ON public.project_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_requests_builder_id ON public.project_requests(builder_id);
CREATE INDEX IF NOT EXISTS idx_project_requests_buyer_id ON public.project_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_project_requests_status ON public.project_requests(status);
