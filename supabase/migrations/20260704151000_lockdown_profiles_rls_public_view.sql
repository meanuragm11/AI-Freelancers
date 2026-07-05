-- CRITICAL SECURITY FIX (Phase 1, item 2)
--
-- `profiles` had two SELECT policies that together allowed ANYONE, including
-- fully unauthenticated (anon) requests, to read every column of every user's
-- row directly via the REST API (e.g. `GET /rest/v1/profiles?select=*`),
-- completely independent of app-level code:
--   - "Profiles are viewable by everyone" (qual: true)
--   - "Allow public read access for freelancers" (qual: is_freelancer = true)
--
-- This exposed is_admin, kyc_status, stripe_account_id, payment_routing_id,
-- payouts_enabled, total_earnings_usd, support_email, and pending_verification
-- for every user on the platform.
--
-- Fix: restrict the base table to the row owner and platform admins only, and
-- add a `profiles_public` view exposing ONLY marketplace-safe columns for
-- public/marketplace use (profile cards, discover, collab counterpart
-- display, reviews, arena rankings, etc). The view is intentionally NOT
-- security_invoker, so it bypasses the now-restrictive RLS on the base table
-- and returns all rows -- this is the standard Supabase pattern for exposing
-- a safe column subset publicly while locking down the underlying table.
--
-- PostgREST can still embed this view from foreign-key columns using the
-- `profiles_public!<fk_column>(...)` hint syntax ("Foreign Key Joins on
-- Views"), which was verified against the live project before this migration
-- was written. App code has been updated accordingly wherever it previously
-- embedded/selected another user's profile via `profiles!<fk>(...)` or a
-- direct `.from('profiles')` lookup by someone else's id.
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Allow public read access for freelancers" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "profiles_select_admin"
on public.profiles for select to authenticated
using (public.is_platform_admin());

create or replace view public.profiles_public
with (security_invoker = false) as
select
  id,
  full_name,
  role,
  company_name,
  created_at,
  reputation_score,
  is_verified,
  platform_role,
  is_freelancer,
  base_price_usd,
  included_revisions,
  extra_revision_price_usd,
  unlimited_revisions,
  external_projects,
  headline,
  location,
  bio,
  tech_stack,
  avatar_url,
  banner_url,
  delivery_time_days,
  languages,
  completed_projects,
  average_rating,
  review_count,
  average_response_hours,
  is_top_expert,
  last_active_at,
  availability_status,
  profile_views
from public.profiles;

comment on view public.profiles_public is
  'Marketplace-safe public projection of profiles. Never add is_admin, kyc_status, stripe_account_id, payment_routing_id, payouts_enabled, total_earnings_usd, support_email, or pending_verification to this view.';

grant select on public.profiles_public to anon, authenticated;
