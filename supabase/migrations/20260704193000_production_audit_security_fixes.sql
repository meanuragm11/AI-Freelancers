-- Production audit security fixes:
--   1. Recreate profiles_public as SECURITY INVOKER with column grants so anon cannot
--      read sensitive profile columns via direct REST access to public.profiles.
--   2. Explicitly revoke anon EXECUTE on privileged RPCs (REVOKE FROM PUBLIC is not
--      sufficient on Supabase; anon retains EXECUTE unless revoked directly).

-- ── profiles_public: SECURITY INVOKER + defense-in-depth column grants for anon ──
drop policy if exists "profiles_select_marketplace" on public.profiles;

create policy "profiles_select_marketplace"
on public.profiles for select
to anon, authenticated
using (true);

drop view if exists public.profiles_public;

create view public.profiles_public
with (security_invoker = true) as
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
  'Marketplace-safe public projection of profiles (SECURITY INVOKER). Never add is_admin, kyc_status, stripe_account_id, payment_routing_id, payouts_enabled, total_earnings_usd, support_email, pending_verification, or moderation columns to this view.';

grant select on public.profiles_public to anon, authenticated;

-- Anon may read marketplace-safe columns only on rows allowed by RLS.
revoke select on public.profiles from anon;
grant select (
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
) on public.profiles to anon;

-- ── Revoke anon EXECUTE on privileged RPCs ──
revoke execute on function public.request_builder_withdrawal(uuid, numeric, text, uuid) from anon;
revoke execute on function public.request_builder_withdrawal(uuid, numeric, text, uuid) from public;
grant execute on function public.request_builder_withdrawal(uuid, numeric, text, uuid) to authenticated, service_role;

revoke execute on function public.respond_to_refund_request(uuid, text, text) from anon;
revoke execute on function public.respond_to_refund_request(uuid, text, text) from public;
grant execute on function public.respond_to_refund_request(uuid, text, text) to authenticated, service_role;

revoke execute on function public.archive_builder_published_listings(uuid) from anon;
revoke execute on function public.archive_builder_published_listings(uuid) from authenticated;
revoke execute on function public.archive_builder_published_listings(uuid) from public;
grant execute on function public.archive_builder_published_listings(uuid) to service_role;
