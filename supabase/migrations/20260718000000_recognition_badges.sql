-- Recognition badge system (replaces Arena leaderboard scoring)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS editors_pick boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.editors_pick IS 'Admin-granted Editor''s Pick recognition badge';

CREATE TABLE IF NOT EXISTS public.builder_recognition_badges (
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key text NOT NULL CHECK (badge_key IN ('trusted', 'rising', 'fast_responder', 'in_demand', 'editors_pick')),
  source text NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'admin')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (builder_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_builder_recognition_badges_key
  ON public.builder_recognition_badges(badge_key);

CREATE INDEX IF NOT EXISTS idx_builder_recognition_badges_granted
  ON public.builder_recognition_badges(granted_at DESC);

ALTER TABLE public.builder_recognition_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS builder_recognition_badges_public_read ON public.builder_recognition_badges;
CREATE POLICY builder_recognition_badges_public_read
  ON public.builder_recognition_badges FOR SELECT
  USING (true);

GRANT SELECT ON public.builder_recognition_badges TO anon, authenticated;

COMMENT ON TABLE public.builder_recognition_badges IS 'Cached auto-computed and admin recognition badges for builders';

-- Deprecate competitive arena_scores columns (table retained for migration safety)
COMMENT ON TABLE public.arena_scores IS 'DEPRECATED — competitive scoring replaced by builder_recognition_badges';
