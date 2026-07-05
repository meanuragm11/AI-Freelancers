ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS banner_image_url text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

ALTER TABLE public.portfolio_projects
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_service_id ON public.portfolio_projects(service_id);

COMMENT ON COLUMN public.services.banner_image_url IS 'Wide hero banner for service detail page';
COMMENT ON COLUMN public.services.cover_image_url IS 'Thumbnail used in cards and listings';
COMMENT ON COLUMN public.services.tags IS 'Searchable marketplace tags';
