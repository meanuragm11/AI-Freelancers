-- Production escrow dispute system: immutable dispute record, timeline, evidence, and workflow guards

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_kind text NOT NULL DEFAULT 'user'
    CHECK (message_kind IN ('user', 'system')),
  ADD COLUMN IF NOT EXISTS system_event_type text NULL;

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id uuid NOT NULL REFERENCES public.collabs(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  freelancer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  opened_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'waiting_for_freelancer'
    CHECK (status IN (
      'waiting_for_freelancer',
      'waiting_for_buyer',
      'negotiation',
      'under_review',
      'arbitration_requested',
      'resolved',
      'closed'
    )),
  primary_reason text NOT NULL,
  detailed_explanation text NOT NULL,
  event_timeline text NOT NULL,
  freelancer_response text NULL,
  freelancer_response_submitted_at timestamptz NULL,
  freelancer_resolution_proposal text NULL,
  escrow_frozen_at timestamptz NOT NULL DEFAULT now(),
  collab_status_before text NULL,
  escrow_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  arbitration_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  arbitration_requested_at timestamptz NULL,
  arbitration_requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_summary text NULL,
  resolved_at timestamptz NULL,
  closed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_one_active_per_collab
  ON public.disputes(collab_id)
  WHERE status IN (
    'waiting_for_freelancer',
    'waiting_for_buyer',
    'negotiation',
    'under_review',
    'arbitration_requested'
  );

CREATE INDEX IF NOT EXISTS idx_disputes_collab_created ON public.disputes(collab_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_participants ON public.disputes(buyer_id, freelancer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

CREATE TABLE IF NOT EXISTS public.dispute_timeline_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE RESTRICT,
  collab_id uuid NOT NULL REFERENCES public.collabs(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('buyer', 'freelancer', 'system', 'admin')),
  entry_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_timeline_dispute_created
  ON public.dispute_timeline_entries(dispute_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_dispute_timeline_collab_created
  ON public.dispute_timeline_entries(collab_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE RESTRICT,
  timeline_entry_id uuid NOT NULL REFERENCES public.dispute_timeline_entries(id) ON DELETE RESTRICT,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NULL,
  file_size bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_created
  ON public.dispute_evidence(dispute_id, created_at ASC);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_timeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read disputes" ON public.disputes;
CREATE POLICY "Participants can read disputes"
  ON public.disputes FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Participants can read dispute timeline" ON public.dispute_timeline_entries;
CREATE POLICY "Participants can read dispute timeline"
  ON public.dispute_timeline_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_timeline_entries.dispute_id
        AND (d.buyer_id = auth.uid() OR d.freelancer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can read dispute evidence" ON public.dispute_evidence;
CREATE POLICY "Participants can read dispute evidence"
  ON public.dispute_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_evidence.dispute_id
        AND (d.buyer_id = auth.uid() OR d.freelancer_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.touch_dispute_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_dispute_updated_at_trigger ON public.disputes;
CREATE TRIGGER touch_dispute_updated_at_trigger
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.touch_dispute_updated_at();

CREATE OR REPLACE FUNCTION public.has_active_dispute(p_collab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.disputes d
    WHERE d.collab_id = p_collab_id
      AND d.status IN (
        'waiting_for_freelancer',
        'waiting_for_buyer',
        'negotiation',
        'under_review',
        'arbitration_requested'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_milestone_changes_during_dispute()
RETURNS trigger AS $$
DECLARE
  v_collab_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_collab_id := NEW.collab_id;
  ELSE
    v_collab_id := COALESCE(NEW.collab_id, OLD.collab_id);
  END IF;

  IF public.has_active_dispute(v_collab_id) THEN
    RAISE EXCEPTION 'Milestone and escrow actions are paused while a dispute is active.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_milestone_changes_during_dispute_trigger ON public.milestones;
CREATE TRIGGER prevent_milestone_changes_during_dispute_trigger
  BEFORE INSERT OR UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.prevent_milestone_changes_during_dispute();

CREATE OR REPLACE FUNCTION public.prevent_reviews_during_dispute()
RETURNS trigger AS $$
BEGIN
  IF public.has_active_dispute(NEW.collab_id) THEN
    RAISE EXCEPTION 'Reviews are paused while a dispute is active.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_reviews_during_dispute_trigger ON public.reviews;
CREATE TRIGGER prevent_reviews_during_dispute_trigger
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_reviews_during_dispute();

CREATE OR REPLACE FUNCTION public.prevent_project_completion_during_dispute()
RETURNS trigger AS $$
BEGIN
  IF public.has_active_dispute(NEW.id)
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'disputed' THEN
    RAISE EXCEPTION 'Project status changes are paused while a dispute is active.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_project_completion_during_dispute_trigger ON public.collabs;
CREATE TRIGGER prevent_project_completion_during_dispute_trigger
  BEFORE UPDATE ON public.collabs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_project_completion_during_dispute();

CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name text;
  v_inbox_link text;
  v_preview text;
  v_project_title text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.message_kind = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT
    CASE WHEN c.buyer_id = NEW.sender_id THEN c.builder_id ELSE c.buyer_id END,
    CASE WHEN c.buyer_id = NEW.sender_id THEN '/builder/inbox' ELSE '/buyer/messages' END,
    COALESCE(c.title, 'Your project')
  INTO v_recipient_id, v_inbox_link, v_project_title
  FROM public.collabs c
  WHERE c.id = NEW.collab_id;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  v_preview := LEFT(COALESCE(NULLIF(TRIM(NEW.text), ''), NULLIF(TRIM(NEW.content), ''), 'New message'), 200);

  IF v_preview LIKE '[[FILE|%' THEN
    v_preview := 'Sent an attachment';
  ELSIF v_preview LIKE '[[MILESTONE|%' THEN
    v_preview := 'Sent a milestone proposal';
  ELSIF v_preview LIKE '[[QUOTATION|%' THEN
    v_preview := 'Sent a quotation';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, is_read, metadata)
  VALUES (
    v_recipient_id,
    'message',
    'New message from ' || v_sender_name,
    v_preview,
    v_inbox_link,
    false,
    jsonb_build_object(
      'collabId', NEW.collab_id,
      'conversationId', NEW.collab_id,
      'messageId', NEW.id,
      'senderId', NEW.sender_id,
      'senderName', v_sender_name,
      'projectName', v_project_title
    )
  );

  RETURN NEW;
END;
$$;
