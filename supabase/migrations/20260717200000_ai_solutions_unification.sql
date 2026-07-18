-- Unify AI Assets into AI Solutions on the services table.
-- Extends services with fulfillment + digital download fields; library supports service purchases.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'paid'
    CHECK (pricing_mode IN ('free', 'paid')),
  ADD COLUMN IF NOT EXISTS delivery_model text NOT NULL DEFAULT 'collaborative'
    CHECK (delivery_model IN ('collaborative', 'instant')),
  ADD COLUMN IF NOT EXISTS fulfillment_payload_text text,
  ADD COLUMN IF NOT EXISTS fulfillment_payload_url text,
  ADD COLUMN IF NOT EXISTS download_bucket text,
  ADD COLUMN IF NOT EXISTS download_file_path text,
  ADD COLUMN IF NOT EXISTS download_file_name text,
  ADD COLUMN IF NOT EXISTS download_file_size bigint,
  ADD COLUMN IF NOT EXISTS download_content_type text,
  ADD COLUMN IF NOT EXISTS download_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sales_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.services.fulfillment_payload_text IS 'Secure text payload — never exposed before purchase';
COMMENT ON COLUMN public.services.fulfillment_payload_url IS 'Secure URL payload — never exposed before purchase';

-- Backfill: existing published services remain collaborative paid listings
UPDATE public.services
SET pricing_mode = CASE WHEN starting_price_usd = 0 THEN 'free' ELSE 'paid' END
WHERE pricing_mode IS NULL OR pricing_mode = 'paid';

-- Library: support service-based purchases alongside legacy component entries
ALTER TABLE public.library
  ALTER COLUMN component_id DROP NOT NULL;

ALTER TABLE public.library
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE CASCADE;

ALTER TABLE public.library
  DROP CONSTRAINT IF EXISTS library_listing_reference_check;

ALTER TABLE public.library
  ADD CONSTRAINT library_listing_reference_check
    CHECK (
      (component_id IS NOT NULL AND service_id IS NULL)
      OR (service_id IS NOT NULL AND component_id IS NULL)
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_library_unique_user_service
  ON public.library(user_id, service_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_library_service_id
  ON public.library(service_id)
  WHERE service_id IS NOT NULL;

-- Allow service_purchase transaction type
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check
    CHECK (transaction_type IN (
      'component_purchase',
      'service_purchase',
      'collab_milestone',
      'escrow_funding',
      'milestone_funding',
      'revision_purchase'
    ));

-- RLS: buyers with library entries retain access to archived instant solutions
DROP POLICY IF EXISTS services_public_read_published ON public.services;
CREATE POLICY services_public_read_published
  ON public.services
  FOR SELECT
  USING (
    status = 'published'
    OR builder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.collabs c
      WHERE c.service_id = services.id
        AND c.buyer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.library l
      WHERE l.service_id = services.id AND l.user_id = auth.uid()
    )
  );
