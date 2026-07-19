-- =============================================================================
-- ZELANCE — DEVELOPMENT DATABASE RESET
-- =============================================================================
--
-- PURPOSE
--   Reset a Supabase *development* database to a clean slate for testing:
--   remove transactional / demo data, zero out dashboard aggregates, keep auth
--   users and profile rows intact.
--
-- ⚠️  DO NOT RUN ON PRODUCTION. Review every section before executing.
-- ⚠️  Run via Supabase SQL Editor (postgres role) or `psql` against dev only.
--
-- PRESERVED (not truncated)
--   • auth.users                         — Supabase Auth accounts
--   • public.profiles                    — all profile rows (identity, roles,
--                                        admin flags, KYC/payout config kept;
--                                        denormalized stats reset below)
--   • public.notification_preferences    — per-user email notification toggles
--   • public.profiles_public             — view (derived from profiles)
--   • Schema, enums, functions, RLS, migrations — unchanged
--   • storage.buckets                    — bucket definitions (objects NOT cleared)
--
-- RUNTIME REQUIREMENTS
--   • Uses SET session_replication_role = 'replica' so FK/user triggers (including
--     protect_profile_privileged_columns and finance append-only guards) do not
--     block TRUNCATE / profile stat reset when run from the SQL Editor.
--   • Missing tables are skipped via to_regclass() — one absent relation no longer
--     aborts the entire truncate batch.
--
-- STORAGE (manual — not included in this SQL)
--   Truncating DB rows does NOT remove Supabase Storage objects. After reset,
--   manually empty dev buckets if needed (chat-attachments, support-attachments,
--   marketplace-uploads, component / deliverable asset buckets).
--
-- VERIFICATION (run after reset — expect 0 rows unless noted)
--   SELECT 'profiles' AS t, count(*) FROM public.profiles
--   UNION ALL SELECT 'auth.users', count(*) FROM auth.users
--   UNION ALL SELECT 'collabs', count(*) FROM public.collabs
--   UNION ALL SELECT 'transactions', count(*) FROM public.transactions
--   UNION ALL SELECT 'finance_ledger_entries', count(*) FROM public.finance_ledger_entries
--   UNION ALL SELECT 'disputes', count(*) FROM public.disputes
--   UNION ALL SELECT 'projects', count(*) FROM public.projects
--   UNION ALL SELECT 'services', count(*) FROM public.services
--   UNION ALL SELECT 'notifications', count(*) FROM public.notifications
--   UNION ALL SELECT 'support_tickets', count(*) FROM public.support_tickets
--   UNION ALL SELECT 'admin_audit_log', count(*) FROM public.admin_audit_log
--   UNION ALL SELECT 'business_events', count(*) FROM public.business_events
--   UNION ALL SELECT 'notification_preferences', count(*) FROM public.notification_preferences;
--
-- DRY RUN
--   Replace the final COMMIT with ROLLBACK; to verify the script without persisting.
--
-- =============================================================================

BEGIN;

-- ── Safety guard (optional — customize for your dev project) ─────────────────
-- Uncomment and set your dev database name to block accidental prod runs:
--
-- DO $$
-- BEGIN
--   IF current_database() NOT IN ('postgres', 'zelance-dev', 'local') THEN
--     RAISE EXCEPTION 'Refusing reset: database % looks like non-dev', current_database();
--   END IF;
-- END $$;

-- Disable user/FK triggers for bulk truncate + privileged profile reset.
-- Required in Supabase SQL Editor (postgres role is not service_role).
SET LOCAL session_replication_role = 'replica';

-- ── 1. Truncate transactional tables ─────────────────────────────────────────
DO $truncate_all$
DECLARE
  tbl text;
  existing_tables text[] := ARRAY[]::text[];
  all_tables text[] := ARRAY[
    -- Finance reconciliation & V2
    'finance_reconciliation_items',
    'finance_reconciliation_runs',
    'finance_ledger_entries',
    'finance_events',
    'finance_payouts',
    'refund_requests',
    'builder_withdrawals',
    'builder_payout_methods',
    'escrow_transactions',
    'transactions',
    'invoices',
    -- Disputes
    'dispute_evidence',
    'dispute_timeline_entries',
    'disputes',
    -- Collab workflow
    'deliverables',
    'revision_requests',
    'milestones',
    'messages',
    'collabs',
    'negotiation_history',
    'quotations',
    'project_requests',
    -- Open projects
    'project_hiring_activities',
    'buyer_inactivity_restriction_events',
    'content_reports',
    'proposal_status_history',
    'proposal_attachments',
    'proposal_versions',
    'proposal_moderation',
    'project_proposals',
    'project_invites',
    'saved_projects',
    'project_analytics',
    'project_questions',
    'project_attachments',
    'project_skills',
    'projects',
    'buyer_marketplace_limits',
    -- Marketplace
    'components',
    'services',
    'portfolio_projects',
    'library',
    'reviews',
    -- Support
    'support_ticket_messages',
    'support_tickets',
    'support_ticket_daily_seq',
    -- Audit / ops / alerts
    'admin_audit_log',
    'admin_internal_notes',
    'business_events',
    'marketplace_audit_logs',
    'moderation_logs',
    'system_alerts',
    -- Notifications & presence
    'notifications',
    'notification_email_log',
    'user_presence',
    -- Trust & safety
    'chat_moderation',
    'project_moderation',
    'user_moderation_warnings',
    'user_moderation_suspensions',
    'founder_moderation_actions',
    'user_trust_scores',
    -- Arena / reputation
    'arena_events',
    'arena_milestones',
    'arena_scores',
    'builder_recognition_badges',
    'builder_daily_activity',
    -- Legacy / optional (truncated when present)
    'project_milestones',
    'work_diaries',
    'saved_experts'
  ];
BEGIN
  RAISE NOTICE '=== Section 1: truncate transactional tables ===';

  FOREACH tbl IN ARRAY all_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      existing_tables := array_append(existing_tables, format('public.%I', tbl));
    ELSE
      RAISE NOTICE 'Skipped missing table public.%', tbl;
    END IF;
  END LOOP;

  IF coalesce(array_length(existing_tables, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No transactional tables found to truncate — aborting reset';
  END IF;

  EXECUTE format(
    'TRUNCATE TABLE %s RESTART IDENTITY CASCADE',
    array_to_string(existing_tables, ', ')
  );

  RAISE NOTICE 'Truncated % public tables (RESTART IDENTITY CASCADE)', array_length(existing_tables, 1);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Section 1 failed during TRUNCATE: % (SQLSTATE %)', SQLERRM, SQLSTATE;
END;
$truncate_all$;

-- ── 2. Reset denormalized profile fields (keep all profile rows) ─────────────
DO $profile_reset$
DECLARE
  reset_rows bigint;
BEGIN
  RAISE NOTICE '=== Section 2: reset denormalized profile fields ===';

  UPDATE public.profiles
  SET
    total_earnings_usd = 0,
    reputation_score = 0,
    completed_projects = 0,
    average_rating = 0,
    review_count = 0,
    average_response_hours = NULL,
    is_top_expert = false,
    profile_views = 0,
    inactive_buyer_restricted_until = NULL,
    inactive_buyer_restriction_started_at = NULL,
    requires_founder_publish_approval = false,
    founder_publish_approval_at = NULL,
    founder_publish_approved_by = NULL,
    verified_buyer = CASE WHEN is_admin THEN verified_buyer ELSE false END,
    verified_buyer_at = CASE WHEN is_admin THEN verified_buyer_at ELSE NULL END,
    editors_pick = CASE WHEN is_admin THEN editors_pick ELSE false END,
    account_status = CASE WHEN is_admin THEN account_status ELSE 'active' END,
    suspension_type = CASE WHEN is_admin THEN suspension_type ELSE NULL END,
    suspended_at = CASE WHEN is_admin THEN suspended_at ELSE NULL END,
    suspended_by = CASE WHEN is_admin THEN suspended_by ELSE NULL END,
    suspension_reason = CASE WHEN is_admin THEN suspension_reason ELSE NULL END,
    suspension_expires_at = CASE WHEN is_admin THEN suspension_expires_at ELSE NULL END,
    reinstated_at = CASE WHEN is_admin THEN reinstated_at ELSE NULL END,
    reinstated_by = CASE WHEN is_admin THEN reinstated_by ELSE NULL END;

  GET DIAGNOSTICS reset_rows = ROW_COUNT;
  RAISE NOTICE 'Updated % profile rows', reset_rows;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Section 2 failed during profile reset: % (SQLSTATE %)', SQLERRM, SQLSTATE;
END;
$profile_reset$;

SET LOCAL session_replication_role = 'origin';

-- ── 3. Post-reset verification (informational — does not fail on non-zero) ───
DO $verify$
DECLARE
  r record;
  nonzero_count integer := 0;
BEGIN
  RAISE NOTICE '=== Section 3: post-reset row counts ===';

  FOR r IN
    SELECT *
    FROM (
      SELECT 'profiles (preserve)' AS label, count(*)::bigint AS cnt FROM public.profiles
      UNION ALL SELECT 'notification_preferences (preserve)', count(*)::bigint FROM public.notification_preferences
      UNION ALL SELECT 'collabs', count(*)::bigint FROM public.collabs
      UNION ALL SELECT 'transactions', count(*)::bigint FROM public.transactions
      UNION ALL SELECT 'finance_ledger_entries', count(*)::bigint FROM public.finance_ledger_entries
      UNION ALL SELECT 'finance_events', count(*)::bigint FROM public.finance_events
      UNION ALL SELECT 'finance_payouts', count(*)::bigint FROM public.finance_payouts
      UNION ALL SELECT 'disputes', count(*)::bigint FROM public.disputes
      UNION ALL SELECT 'projects', count(*)::bigint FROM public.projects
      UNION ALL SELECT 'services', count(*)::bigint FROM public.services
      UNION ALL SELECT 'notifications', count(*)::bigint FROM public.notifications
      UNION ALL SELECT 'support_tickets', count(*)::bigint FROM public.support_tickets
      UNION ALL SELECT 'admin_audit_log', count(*)::bigint FROM public.admin_audit_log
      UNION ALL SELECT 'business_events', count(*)::bigint FROM public.business_events
    ) s
    ORDER BY label
  LOOP
    RAISE NOTICE '%: %', r.label, r.cnt;
    IF r.label NOT LIKE '%(preserve)%' AND r.cnt <> 0 THEN
      nonzero_count := nonzero_count + 1;
    END IF;
  END LOOP;

  IF nonzero_count > 0 THEN
    RAISE WARNING 'Verification: % transactional table(s) still have rows (see NOTICE lines above)', nonzero_count;
  ELSE
    RAISE NOTICE 'Verification passed: all checked transactional tables are empty';
  END IF;
END;
$verify$;

COMMIT;

-- For dry-run testing, replace COMMIT above with:
-- ROLLBACK;
