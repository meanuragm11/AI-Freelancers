-- Public read access for published services; builders manage their own listings.

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS services_public_read_published ON public.services;
CREATE POLICY services_public_read_published
  ON public.services
  FOR SELECT
  USING (status = 'published' OR builder_id = auth.uid());

DROP POLICY IF EXISTS services_builder_insert ON public.services;
CREATE POLICY services_builder_insert
  ON public.services
  FOR INSERT
  WITH CHECK (builder_id = auth.uid());

DROP POLICY IF EXISTS services_builder_update ON public.services;
CREATE POLICY services_builder_update
  ON public.services
  FOR UPDATE
  USING (builder_id = auth.uid())
  WITH CHECK (builder_id = auth.uid());

DROP POLICY IF EXISTS services_builder_delete ON public.services;
CREATE POLICY services_builder_delete
  ON public.services
  FOR DELETE
  USING (builder_id = auth.uid());
