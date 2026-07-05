-- Builders must be able to update and delete their own component listings.

ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Builders can update own components" ON public.components;
CREATE POLICY "Builders can update own components"
  ON public.components
  FOR UPDATE
  USING (auth.uid() = builder_id)
  WITH CHECK (auth.uid() = builder_id);

DROP POLICY IF EXISTS "Builders can delete own components" ON public.components;
CREATE POLICY "Builders can delete own components"
  ON public.components
  FOR DELETE
  USING (auth.uid() = builder_id);
