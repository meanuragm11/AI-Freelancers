-- Enable Row Level Security and create policies for collabs table
-- Applied to fix custom project request submission failures (collabs insert was failing)

-- Enable RLS on collabs table
ALTER TABLE public.collabs ENABLE ROW LEVEL SECURITY;

-- Policy: Buyers can insert collabs (when creating project requests)
DROP POLICY IF EXISTS "Buyers can insert collabs" ON public.collabs;
CREATE POLICY "Buyers can insert collabs"
  ON public.collabs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Policy: Builders can insert collabs (when accepting quotations)
DROP POLICY IF EXISTS "Builders can insert collabs" ON public.collabs;
CREATE POLICY "Builders can insert collabs"
  ON public.collabs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = builder_id);

-- Policy: Buyers can read their own collabs
DROP POLICY IF EXISTS "Buyers can read own collabs" ON public.collabs;
CREATE POLICY "Buyers can read own collabs"
  ON public.collabs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Policy: Builders can read their own collabs
DROP POLICY IF EXISTS "Builders can read own collabs" ON public.collabs;
CREATE POLICY "Builders can read own collabs"
  ON public.collabs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = builder_id);

-- Policy: Buyers can update their own collabs
DROP POLICY IF EXISTS "Buyers can update own collabs" ON public.collabs;
CREATE POLICY "Buyers can update own collabs"
  ON public.collabs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Policy: Builders can update their own collabs
DROP POLICY IF EXISTS "Builders can update own collabs" ON public.collabs;
CREATE POLICY "Builders can update own collabs"
  ON public.collabs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = builder_id)
  WITH CHECK (auth.uid() = builder_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_collabs_buyer_id ON public.collabs(buyer_id);
CREATE INDEX IF NOT EXISTS idx_collabs_builder_id ON public.collabs(builder_id);
CREATE INDEX IF NOT EXISTS idx_collabs_status ON public.collabs(status);
