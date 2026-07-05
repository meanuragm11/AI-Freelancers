-- Soft delete / archive for services and components (AI assets).
--
-- Builders "delete" a listing by archiving it: the listing disappears from the public
-- marketplace (discover, search, arena, public profile) and can no longer be purchased,
-- but every historical relationship (collabs, transactions, reviews, messages, escrow,
-- library entries, purchased files) is fully preserved. Buyers keep access to what they
-- already bought, and builders keep access to active/completed orders for the listing.

-- 1. Allow 'archived' as a valid services status (components already supports it).
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_status_check
  CHECK (status IN ('draft', 'published', 'paused', 'archived'));

-- 2. Track when a listing was archived.
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 3. Remove hard-delete capability for builders. Archiving (status update) is now the only
-- supported removal path from the client, so CASCADE/SET NULL deletes on purchases, reviews,
-- portfolio links, etc. can never be triggered by a builder "deleting" a listing. Admins retain
-- full access (and hard-delete capability) via the existing "Admins can manage ..." ALL policies.
DROP POLICY IF EXISTS services_builder_delete ON public.services;
DROP POLICY IF EXISTS "Builders can delete own components" ON public.components;

-- 4. Services: buyers with an order (collab) referencing the service must keep read access even
-- once it's archived/paused, in addition to public-published visibility and the owning builder.
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
  );

-- 5. Components: tighten public visibility. Previously "true", which exposed draft/paused/archived
-- rows to anyone via the Data API even though application code filtered by status client-side.
-- Buyers who already own an archived component keep access via their library entry.
DROP POLICY IF EXISTS "Anyone can view components" ON public.components;
CREATE POLICY "Anyone can view components"
  ON public.components
  FOR SELECT
  USING (
    status = 'published'
    OR builder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.library l
      WHERE l.component_id = components.id
        AND l.user_id = auth.uid()
    )
  );

-- 6. Keep semantic component search consistent with the marketplace: it must exclude
-- archived/draft/paused assets, matching the keyword search path used elsewhere.
CREATE OR REPLACE FUNCTION public.match_components(
  query_embedding vector,
  match_threshold double precision,
  match_count integer,
  filter_category text DEFAULT 'All'::text
)
RETURNS TABLE(id uuid, title text, description text, category text, price_usd numeric, sales_count integer, thumbnail_url text, similarity double precision)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    id,
    title,
    description,
    category,
    price_usd,
    sales_count,
    thumbnail_url,
    1 - (embedding <=> query_embedding) AS similarity
  FROM components
  WHERE status = 'published'
    AND (filter_category = 'All' OR category = filter_category)
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$function$;
