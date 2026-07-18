-- Arena reputation system: scores, events, milestones, and public solution capability flags.

-- Public capability flags (no secure content leakage)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS capability_instant_download boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capability_secure_delivery boolean NOT NULL DEFAULT false;

UPDATE public.services
SET
  capability_instant_download = (download_file_path IS NOT NULL),
  capability_secure_delivery = (
    fulfillment_payload_text IS NOT NULL OR fulfillment_payload_url IS NOT NULL
  )
WHERE capability_instant_download = false AND capability_secure_delivery = false;

COMMENT ON COLUMN public.services.capability_instant_download IS 'Public flag: listing includes digital download (no file path exposed)';
COMMENT ON COLUMN public.services.capability_secure_delivery IS 'Public flag: listing includes secure payload delivery';

-- Cached arena scores (public columns only — no pillar breakdown)
CREATE TABLE IF NOT EXISTS public.arena_scores (
  builder_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  arena_score integer NOT NULL DEFAULT 0 CHECK (arena_score >= 0 AND arena_score <= 1000),
  rank integer,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 6),
  progress_to_next numeric(5,2) NOT NULL DEFAULT 0,
  next_milestone text,
  last_computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_scores_rank ON public.arena_scores(rank ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_arena_scores_score ON public.arena_scores(arena_score DESC);

-- Event log for anti-gaming and activity tracking
CREATE TABLE IF NOT EXISTS public.arena_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_events_builder_created
  ON public.arena_events(builder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_arena_events_type_created
  ON public.arena_events(event_type, created_at DESC);

-- Achieved growth milestones (extensible for future seasons/XP)
CREATE TABLE IF NOT EXISTS public.arena_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (builder_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_arena_milestones_builder
  ON public.arena_milestones(builder_id);

-- RLS: arena_scores readable publicly; events/milestones owner-only
ALTER TABLE public.arena_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arena_scores_public_read ON public.arena_scores;
CREATE POLICY arena_scores_public_read
  ON public.arena_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS arena_events_owner_read ON public.arena_events;
CREATE POLICY arena_events_owner_read
  ON public.arena_events FOR SELECT TO authenticated
  USING (builder_id = auth.uid());

DROP POLICY IF EXISTS arena_milestones_owner_read ON public.arena_milestones;
CREATE POLICY arena_milestones_owner_read
  ON public.arena_milestones FOR SELECT TO authenticated
  USING (builder_id = auth.uid());

GRANT SELECT ON public.arena_scores TO anon, authenticated;
GRANT SELECT ON public.arena_events TO authenticated;
GRANT SELECT ON public.arena_milestones TO authenticated;

COMMENT ON TABLE public.arena_scores IS 'Cached Arena scores — pillar weights and formulas are server-side only';
COMMENT ON TABLE public.arena_events IS 'Arena activity events with idempotency for anti-gaming';
COMMENT ON TABLE public.arena_milestones IS 'Extensible milestone tracking for Arena growth pillar';
