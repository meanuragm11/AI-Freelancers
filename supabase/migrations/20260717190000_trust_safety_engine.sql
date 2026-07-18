-- Trust & Safety Engine: AI moderation tables, escalation tracking, trust scores

-- ─── Shared moderation status values ────────────────────────────────────────
-- pending | approved | flagged | blocked | reviewed

-- ─── Central moderation audit log ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'proposal', 'chat', 'user')),
  entity_id uuid NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ai_model text,
  risk_score numeric(5,2) NOT NULL DEFAULT 0,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  category text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'flagged', 'blocked', 'reviewed')),
  raw_ai_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  gemini_failed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_entity
  ON public.moderation_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_status
  ON public.moderation_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_user
  ON public.moderation_logs(user_id, created_at DESC);

-- ─── Per-target moderation records ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  collab_id uuid NOT NULL REFERENCES public.collabs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_snapshot text NOT NULL,
  risk_score numeric(5,2) NOT NULL DEFAULT 0,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  category text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'flagged', 'blocked', 'reviewed')),
  moderation_log_id uuid REFERENCES public.moderation_logs(id) ON DELETE SET NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_moderation_message
  ON public.chat_moderation(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_moderation_status
  ON public.chat_moderation(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_moderation_collab
  ON public.chat_moderation(collab_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_snapshot text NOT NULL,
  description_snapshot text NOT NULL DEFAULT '',
  risk_score numeric(5,2) NOT NULL DEFAULT 0,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  category text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'flagged', 'blocked', 'reviewed')),
  moderation_log_id uuid REFERENCES public.moderation_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_moderation_project
  ON public.project_moderation(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_moderation_status
  ON public.project_moderation(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.proposal_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.project_proposals(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter_snapshot text NOT NULL,
  risk_score numeric(5,2) NOT NULL DEFAULT 0,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  category text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'flagged', 'blocked', 'reviewed')),
  moderation_log_id uuid REFERENCES public.moderation_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_moderation_proposal
  ON public.proposal_moderation(proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_moderation_status
  ON public.proposal_moderation(status, created_at DESC);

-- ─── User warnings & automated suspensions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_moderation_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offence_number integer NOT NULL DEFAULT 1,
  category text,
  reason text NOT NULL,
  source_entity_type text CHECK (source_entity_type IN ('project', 'proposal', 'chat')),
  source_entity_id uuid,
  moderation_log_id uuid REFERENCES public.moderation_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_moderation_warnings_user
  ON public.user_moderation_warnings(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_moderation_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offence_number integer NOT NULL,
  suspension_type text NOT NULL CHECK (suspension_type IN ('24h_restriction', '7d_suspension', 'permanent_ban')),
  reason text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source_entity_type text CHECK (source_entity_type IN ('project', 'proposal', 'chat')),
  source_entity_id uuid,
  moderation_log_id uuid REFERENCES public.moderation_logs(id) ON DELETE SET NULL,
  lifted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_moderation_suspensions_user
  ON public.user_moderation_suspensions(user_id, created_at DESC);

-- ─── Founder moderation actions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.founder_moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('warn', 'suspend', 'ban', 'remove_content', 'restore_content', 'approve', 'dismiss')),
  target_type text NOT NULL CHECK (target_type IN ('project', 'proposal', 'chat', 'user')),
  target_id uuid NOT NULL,
  moderation_record_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founder_moderation_actions_target
  ON public.founder_moderation_actions(target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_moderation_actions_founder
  ON public.founder_moderation_actions(founder_id, created_at DESC);

-- ─── User trust scores ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_trust_scores (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  trust_score numeric(5,2) NOT NULL DEFAULT 100,
  offence_count integer NOT NULL DEFAULT 0,
  last_offence_at timestamptz,
  last_moderation_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Extend proposals with moderation status
ALTER TABLE public.project_proposals
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_proposals_moderation_status_check'
  ) THEN
    ALTER TABLE public.project_proposals
      ADD CONSTRAINT project_proposals_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'blocked', 'reviewed'));
  END IF;
END $$;

-- Extend messages with moderation fields
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_moderation_status_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'blocked', 'reviewed'));
  END IF;
END $$;

-- ─── Updated-at triggers ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.moderation_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_moderation_updated_at ON public.chat_moderation;
CREATE TRIGGER trg_chat_moderation_updated_at
  BEFORE UPDATE ON public.chat_moderation
  FOR EACH ROW EXECUTE FUNCTION public.moderation_set_updated_at();

DROP TRIGGER IF EXISTS trg_project_moderation_updated_at ON public.project_moderation;
CREATE TRIGGER trg_project_moderation_updated_at
  BEFORE UPDATE ON public.project_moderation
  FOR EACH ROW EXECUTE FUNCTION public.moderation_set_updated_at();

DROP TRIGGER IF EXISTS trg_proposal_moderation_updated_at ON public.proposal_moderation;
CREATE TRIGGER trg_proposal_moderation_updated_at
  BEFORE UPDATE ON public.proposal_moderation
  FOR EACH ROW EXECUTE FUNCTION public.moderation_set_updated_at();

DROP TRIGGER IF EXISTS trg_user_trust_scores_updated_at ON public.user_trust_scores;
CREATE TRIGGER trg_user_trust_scores_updated_at
  BEFORE UPDATE ON public.user_trust_scores
  FOR EACH ROW EXECUTE FUNCTION public.moderation_set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_moderation_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_moderation_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;

-- Users can view their own warnings
DROP POLICY IF EXISTS "Users view own warnings" ON public.user_moderation_warnings;
CREATE POLICY "Users view own warnings"
  ON public.user_moderation_warnings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can view their own trust score
DROP POLICY IF EXISTS "Users view own trust score" ON public.user_trust_scores;
CREATE POLICY "Users view own trust score"
  ON public.user_trust_scores FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins read all moderation tables via is_platform_admin()
DROP POLICY IF EXISTS "Admins read moderation logs" ON public.moderation_logs;
CREATE POLICY "Admins read moderation logs"
  ON public.moderation_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins read chat moderation" ON public.chat_moderation;
CREATE POLICY "Admins read chat moderation"
  ON public.chat_moderation FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins read project moderation" ON public.project_moderation;
CREATE POLICY "Admins read project moderation"
  ON public.project_moderation FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins read proposal moderation" ON public.proposal_moderation;
CREATE POLICY "Admins read proposal moderation"
  ON public.proposal_moderation FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins read user suspensions" ON public.user_moderation_suspensions;
CREATE POLICY "Admins read user suspensions"
  ON public.user_moderation_suspensions FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins read founder moderation actions" ON public.founder_moderation_actions;
CREATE POLICY "Admins read founder moderation actions"
  ON public.founder_moderation_actions FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Inserts/updates happen exclusively via service role from server-side routes.
