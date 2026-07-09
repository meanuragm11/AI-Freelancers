-- Open Projects: public hiring marketplace (Upwork-style)
-- Integrates with existing collabs / project_requests / escrow on hire

-- ─── Core projects table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text,
  budget_min_usd numeric(10,2),
  budget_max_usd numeric(10,2),
  budget_type text NOT NULL DEFAULT 'fixed'
    CHECK (budget_type IN ('fixed', 'hourly', 'open')),
  payment_type text NOT NULL DEFAULT 'single_payment'
    CHECK (payment_type IN ('single_payment', 'milestone_payment')),
  expected_duration_days integer,
  deadline date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'hired', 'cancelled')),
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'invite_only', 'private')),
  experience_level text DEFAULT 'intermediate'
    CHECK (experience_level IN ('entry', 'intermediate', 'expert')),
  project_type text DEFAULT 'one_time'
    CHECK (project_type IN ('one_time', 'ongoing')),
  builder_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  proposal_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  hired_builder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  hired_proposal_id uuid,
  collab_id uuid REFERENCES public.collabs(id) ON DELETE SET NULL,
  project_request_id uuid REFERENCES public.project_requests(id) ON DELETE SET NULL,
  published_at timestamptz,
  closed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_buyer_id ON public.projects(buyer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_published_at ON public.projects(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at) WHERE deleted_at IS NULL;

-- ─── Related tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, skill)
);

CREATE TABLE IF NOT EXISTS public.project_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_projects (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, builder_id)
);

CREATE TABLE IF NOT EXISTS public.project_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter text NOT NULL DEFAULT '',
  proposed_amount_usd numeric(10,2) NOT NULL,
  proposed_duration_days integer,
  payment_type text NOT NULL DEFAULT 'single_payment'
    CHECK (payment_type IN ('single_payment', 'milestone_payment')),
  proposed_milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_proposals_unique_active
  ON public.project_proposals (project_id, builder_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_proposals_project_id ON public.project_proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_project_proposals_builder_id ON public.project_proposals(builder_id);
CREATE INDEX IF NOT EXISTS idx_project_proposals_status ON public.project_proposals(status);

ALTER TABLE public.projects
  ADD CONSTRAINT projects_hired_proposal_id_fkey
  FOREIGN KEY (hired_proposal_id) REFERENCES public.project_proposals(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.proposal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.project_proposals(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposal_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.project_proposals(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'proposal', 'profile')),
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_entity ON public.content_reports(entity_type, entity_id);

-- ─── Extend existing tables ────────────────────────────────────────────────

ALTER TABLE public.collabs
  ADD COLUMN IF NOT EXISTS open_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.project_requests
  ADD COLUMN IF NOT EXISTS open_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hired_proposal_id uuid REFERENCES public.project_proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collabs_open_project_id ON public.collabs(open_project_id);
CREATE INDEX IF NOT EXISTS idx_project_requests_open_project_id ON public.project_requests(open_project_id);

-- ─── Triggers ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.projects_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_set_updated_at();

CREATE OR REPLACE FUNCTION public.project_proposals_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_proposals_updated_at ON public.project_proposals;
CREATE TRIGGER trg_project_proposals_updated_at
  BEFORE UPDATE ON public.project_proposals
  FOR EACH ROW EXECUTE FUNCTION public.project_proposals_set_updated_at();

CREATE OR REPLACE FUNCTION public.increment_project_proposal_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted') THEN
    UPDATE public.projects SET proposal_count = proposal_count + 1 WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_proposal_count ON public.project_proposals;
CREATE TRIGGER trg_increment_proposal_count
  AFTER INSERT OR UPDATE OF status ON public.project_proposals
  FOR EACH ROW EXECUTE FUNCTION public.increment_project_proposal_count();

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- projects: public read for published; owner full access
DROP POLICY IF EXISTS "Anyone can view published projects" ON public.projects;
CREATE POLICY "Anyone can view published projects"
  ON public.projects FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      status = 'published'
      OR buyer_id = auth.uid()
      OR hired_builder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Buyers can insert projects" ON public.projects;
CREATE POLICY "Buyers can insert projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can update own projects" ON public.projects;
CREATE POLICY "Buyers can update own projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- project_skills
DROP POLICY IF EXISTS "View skills for visible projects" ON public.project_skills;
CREATE POLICY "View skills for visible projects"
  ON public.project_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.deleted_at IS NULL
        AND (p.status = 'published' OR p.buyer_id = auth.uid() OR p.hired_builder_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Buyers manage project skills" ON public.project_skills;
CREATE POLICY "Buyers manage project skills"
  ON public.project_skills FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  );

-- project_attachments (same pattern)
DROP POLICY IF EXISTS "View attachments for visible projects" ON public.project_attachments;
CREATE POLICY "View attachments for visible projects"
  ON public.project_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.deleted_at IS NULL
        AND (p.status = 'published' OR p.buyer_id = auth.uid() OR p.hired_builder_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Buyers manage project attachments" ON public.project_attachments;
CREATE POLICY "Buyers manage project attachments"
  ON public.project_attachments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  );

-- project_questions
DROP POLICY IF EXISTS "View questions on visible projects" ON public.project_questions;
CREATE POLICY "View questions on visible projects"
  ON public.project_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.deleted_at IS NULL
        AND (p.status = 'published' OR p.buyer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users ask questions" ON public.project_questions;
CREATE POLICY "Authenticated users ask questions"
  ON public.project_questions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = asker_id);

DROP POLICY IF EXISTS "Buyers answer questions" ON public.project_questions;
CREATE POLICY "Buyers answer questions"
  ON public.project_questions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  );

-- saved_projects
DROP POLICY IF EXISTS "Users manage own saved projects" ON public.saved_projects;
CREATE POLICY "Users manage own saved projects"
  ON public.saved_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- project_invites
DROP POLICY IF EXISTS "Involved parties view invites" ON public.project_invites;
CREATE POLICY "Involved parties view invites"
  ON public.project_invites FOR SELECT TO authenticated
  USING (
    auth.uid() = builder_id
    OR auth.uid() = invited_by
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Buyers create invites" ON public.project_invites;
CREATE POLICY "Buyers create invites"
  ON public.project_invites FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  );

-- project_proposals: CRITICAL privacy — builder sees own; buyer sees all on their project
DROP POLICY IF EXISTS "Builders view own proposals" ON public.project_proposals;
CREATE POLICY "Builders view own proposals"
  ON public.project_proposals FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      auth.uid() = builder_id
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.buyer_id = auth.uid() AND p.deleted_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "Builders insert proposals" ON public.project_proposals;
CREATE POLICY "Builders insert proposals"
  ON public.project_proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = builder_id);

DROP POLICY IF EXISTS "Builders update own proposals" ON public.project_proposals;
CREATE POLICY "Builders update own proposals"
  ON public.project_proposals FOR UPDATE TO authenticated
  USING (auth.uid() = builder_id)
  WITH CHECK (auth.uid() = builder_id);

DROP POLICY IF EXISTS "Buyers update proposal status" ON public.project_proposals;
CREATE POLICY "Buyers update proposal status"
  ON public.project_proposals FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  );

-- proposal_attachments
DROP POLICY IF EXISTS "View proposal attachments with access" ON public.proposal_attachments;
CREATE POLICY "View proposal attachments with access"
  ON public.proposal_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_proposals pp
      WHERE pp.id = proposal_id AND pp.deleted_at IS NULL
        AND (
          pp.builder_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pp.project_id AND p.buyer_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Builders manage proposal attachments" ON public.proposal_attachments;
CREATE POLICY "Builders manage proposal attachments"
  ON public.proposal_attachments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_proposals pp
      WHERE pp.id = proposal_id AND pp.builder_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_proposals pp
      WHERE pp.id = proposal_id AND pp.builder_id = auth.uid()
    )
  );

-- proposal_status_history
DROP POLICY IF EXISTS "View proposal history with access" ON public.proposal_status_history;
CREATE POLICY "View proposal history with access"
  ON public.proposal_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_proposals pp
      WHERE pp.id = proposal_id
        AND (
          pp.builder_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pp.project_id AND p.buyer_id = auth.uid())
        )
    )
  );

-- project_analytics: insert via service role; buyers see own
DROP POLICY IF EXISTS "Buyers view project analytics" ON public.project_analytics;
CREATE POLICY "Buyers view project analytics"
  ON public.project_analytics FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.buyer_id = auth.uid())
  );

-- content_reports
DROP POLICY IF EXISTS "Users create reports" ON public.content_reports;
CREATE POLICY "Users create reports"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users view own reports" ON public.content_reports;
CREATE POLICY "Users view own reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);
