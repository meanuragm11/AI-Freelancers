-- Zelance Marketplace Pivot: services, portfolio, requests, quotations
-- Applied via Supabase MCP on 2026-06-29

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  short_description text,
  detailed_description text,
  category text,
  ai_skills text[] DEFAULT '{}',
  cover_image_url text,
  gallery_urls text[] DEFAULT '{}',
  demo_video_url text,
  faqs jsonb DEFAULT '[]'::jsonb,
  whats_included text[] DEFAULT '{}',
  delivery_time_days integer NOT NULL DEFAULT 7,
  included_revisions integer NOT NULL DEFAULT 1,
  extra_revision_price_usd numeric(10,2) DEFAULT 0,
  requirements_from_buyer text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused')),
  starting_price_usd numeric(10,2) NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_builder_id ON public.services(builder_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);

CREATE TABLE IF NOT EXISTS public.portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  short_description text,
  detailed_description text,
  ai_technologies text[] DEFAULT '{}',
  category text,
  project_url text,
  github_url text,
  live_demo_url text,
  media_files jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  budget_usd numeric(10,2),
  expected_deadline date,
  reference_links text[] DEFAULT '{}',
  required_technologies text[] DEFAULT '{}',
  attachment_urls jsonb DEFAULT '[]'::jsonb,
  priority text DEFAULT 'normal',
  additional_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'negotiating', 'quoted', 'completed')),
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_request_id uuid NOT NULL REFERENCES public.project_requests(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price_usd numeric(10,2) NOT NULL,
  estimated_delivery_days integer NOT NULL DEFAULT 7,
  included_revisions integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'changes_requested')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collabs ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE public.collabs ADD COLUMN IF NOT EXISTS project_request_id uuid REFERENCES public.project_requests(id) ON DELETE SET NULL;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;
