-- Buyer critical workflow hardening: private assets, deliverables, idempotency, status consistency.

ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS asset_bucket text,
  ADD COLUMN IF NOT EXISTS asset_file_path text,
  ADD COLUMN IF NOT EXISTS asset_file_name text,
  ADD COLUMN IF NOT EXISTS asset_file_size bigint,
  ADD COLUMN IF NOT EXISTS asset_content_type text,
  ADD COLUMN IF NOT EXISTS asset_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.components
SET published_at = COALESCE(published_at, created_at, now())
WHERE status = 'published' AND published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_components_published_valid
  ON public.components(status, price_usd, created_at DESC)
  WHERE status = 'published'
    AND title IS NOT NULL
    AND description IS NOT NULL
    AND price_usd >= 0
    AND (
      delivery_method = 'secure_text'
      OR asset_file_path IS NOT NULL
      OR NULLIF(file_url, '') IS NOT NULL
    );

ALTER TABLE public.library
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'purchase'
    CHECK (source IN ('purchase', 'free_acquisition', 'admin_grant')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_library_unique_user_component
  ON public.library(user_id, component_id);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_order_id_unique
  ON public.transactions(order_id)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_razorpay_payment_unique
  ON public.transactions(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_pending_cleanup
  ON public.transactions(status, payment_expires_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id uuid NOT NULL REFERENCES public.collabs(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  file_bucket text,
  file_path text,
  file_name text,
  file_size bigint,
  file_type text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'accepted', 'revision_requested')),
  revision_notes text,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_collab_created
  ON public.deliverables(collab_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deliverables_milestone_status
  ON public.deliverables(milestone_id, status);

CREATE TABLE IF NOT EXISTS public.revision_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id uuid NOT NULL REFERENCES public.collabs(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  deliverable_id uuid REFERENCES public.deliverables(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_revision_requests_collab_created
  ON public.revision_requests(collab_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  direct_messages_email boolean NOT NULL DEFAULT true,
  milestones_email boolean NOT NULL DEFAULT true,
  purchases_email boolean NOT NULL DEFAULT true,
  disputes_email boolean NOT NULL DEFAULT true,
  marketing_email boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read deliverables" ON public.deliverables;
CREATE POLICY "Participants can read deliverables"
  ON public.deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collabs c
      WHERE c.id = deliverables.collab_id
        AND (c.buyer_id = auth.uid() OR c.builder_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can read revisions" ON public.revision_requests;
CREATE POLICY "Participants can read revisions"
  ON public.revision_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collabs c
      WHERE c.id = revision_requests.collab_id
        AND (c.buyer_id = auth.uid() OR c.builder_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_library_updated_at_trigger ON public.library;
CREATE TRIGGER touch_library_updated_at_trigger
  BEFORE UPDATE ON public.library
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_transactions_updated_at_trigger ON public.transactions;
CREATE TRIGGER touch_transactions_updated_at_trigger
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_deliverables_updated_at_trigger ON public.deliverables;
CREATE TRIGGER touch_deliverables_updated_at_trigger
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_notification_preferences_updated_at_trigger ON public.notification_preferences;
CREATE TRIGGER touch_notification_preferences_updated_at_trigger
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_buyer_collab
  ON public.reviews(buyer_id, collab_id)
  WHERE collab_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_transactions_unique_funding
  ON public.escrow_transactions(milestone_id, transaction_type)
  WHERE transaction_type = 'milestone_funding';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency
  ON public.notifications(user_id, type, ((metadata ->> 'idempotencyKey')))
  WHERE metadata ? 'idempotencyKey';

CREATE OR REPLACE FUNCTION public.prevent_invalid_collab_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN (
    'draft',
    'pending',
    'pending_funding',
    'funded',
    'active',
    'in_progress',
    'submitted',
    'pending_approval',
    'completed',
    'released',
    'disputed',
    'cancelled',
    'canceled',
    'rejected',
    'expired'
  ) THEN
    RAISE EXCEPTION 'Invalid collab status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_invalid_collab_status_trigger ON public.collabs;
CREATE TRIGGER prevent_invalid_collab_status_trigger
  BEFORE INSERT OR UPDATE OF status ON public.collabs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_invalid_collab_status();

CREATE OR REPLACE FUNCTION public.prevent_invalid_milestone_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'funded', 'in_progress', 'submitted', 'approved', 'released', 'completed') THEN
    RAISE EXCEPTION 'Invalid milestone status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_invalid_milestone_status_trigger ON public.milestones;
CREATE TRIGGER prevent_invalid_milestone_status_trigger
  BEFORE INSERT OR UPDATE OF status ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.prevent_invalid_milestone_status();
