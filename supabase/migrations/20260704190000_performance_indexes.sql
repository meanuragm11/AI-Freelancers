-- Phase 3D: indexes on high-traffic FK/lookup columns.
--
-- Analysis (via pg_stat_user_tables on the live project before this migration):
-- transactions (701 seq_scan / 0 idx_scan), notifications (1058 seq_scan / 83 idx_scan),
-- messages (714 seq_scan / 14 idx_scan), and milestones (772 seq_scan / 67 idx_scan) all
-- show heavy sequential-scan usage relative to index usage, confirming their most common
-- lookup columns (buyer_id/item_id, user_id, collab_id) are unindexed. disputes and reviews
-- are lower-volume today but are queried by non-indexed FK columns (freelancer_id,
-- buyer_id/service_id) from founder + dashboard views, so are included pre-emptively.
-- Also covers a few clearly-missing FK indexes on core escrow/milestone tables while here.

-- ── transactions: buyer dashboard lookups, milestone/asset item lookups ──
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_created ON public.transactions(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_item ON public.transactions(item_id);

-- ── messages: chat workspace is the single hottest read path in the app ──
CREATE INDEX IF NOT EXISTS idx_messages_collab_created ON public.messages(collab_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- ── notifications: bell/list fetch by user, plus unread-count queries ──
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- ── reviews: profile pages filter by buyer and by service ──
CREATE INDEX IF NOT EXISTS idx_reviews_buyer ON public.reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service ON public.reviews(service_id);

-- ── disputes: founder + builder views filter by freelancer_id and opened_by ──
CREATE INDEX IF NOT EXISTS idx_disputes_freelancer ON public.disputes(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON public.disputes(opened_by);

-- ── escrow/milestone tables: fully unindexed on their FK columns today ──
CREATE INDEX IF NOT EXISTS idx_milestones_collab ON public.milestones(collab_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_collab ON public.project_milestones(collab_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_collab ON public.escrow_transactions(collab_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_buyer ON public.escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_builder ON public.escrow_transactions(builder_id);

-- ── collabs: project_request/service lookups used by proposal + review flows ──
CREATE INDEX IF NOT EXISTS idx_collabs_project_request ON public.collabs(project_request_id);
CREATE INDEX IF NOT EXISTS idx_collabs_service ON public.collabs(service_id);
