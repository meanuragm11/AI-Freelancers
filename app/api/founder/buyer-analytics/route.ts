import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { ARCHIVE_REASON_INACTIVITY } from '@/lib/open-projects/buyerPublishingConstants';
import { getPlatformAverageFirstResponseHours } from '@/lib/open-projects/buyerTrustSignals';

export async function GET() {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      activeBuyersResult,
      verifiedBuyersResult,
      archivedProjectsResult,
      publishedProjectsResult,
      inactivityArchivedResult,
      restrictedBuyersResult,
      restoredProjectsResult,
      fraudBuyersResult,
      avgResponseHours,
    ] = await Promise.all([
      supabaseAdmin
        .from('projects')
        .select('buyer_id')
        .in('status', ['published', 'receiving_proposals', 'negotiating'])
        .is('deleted_at', null)
        .gte('published_at', thirtyDaysAgo),
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('verified_buyer', true),
      supabaseAdmin
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'archived')
        .is('deleted_at', null),
      supabaseAdmin
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .not('published_at', 'is', null)
        .is('deleted_at', null)
        .gte('published_at', thirtyDaysAgo),
      supabaseAdmin
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'archived')
        .eq('archive_reason', ARCHIVE_REASON_INACTIVITY)
        .is('deleted_at', null)
        .gte('archived_at', thirtyDaysAgo),
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or(
          `inactive_buyer_restricted_until.gt.${new Date().toISOString()},requires_founder_publish_approval.eq.true`
        ),
      supabaseAdmin
        .from('marketplace_audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'project')
        .in('action', ['restored_from_archive', 'founder_restored_from_archive'])
        .gte('created_at', thirtyDaysAgo),
      supabaseAdmin
        .from('moderation_logs')
        .select('user_id')
        .eq('category', 'fraud')
        .in('status', ['flagged', 'blocked', 'reviewed']),
      getPlatformAverageFirstResponseHours(supabaseAdmin),
    ]);

    const activeBuyerIds = new Set(
      (activeBuyersResult.data ?? []).map((row: { buyer_id: string }) => row.buyer_id)
    );
    const publishedCount = publishedProjectsResult.count ?? 0;
    const inactivityArchivedCount = inactivityArchivedResult.count ?? 0;
    const archiveRate =
      publishedCount > 0 ? inactivityArchivedCount / publishedCount : 0;

    const fraudBuyerIds = new Set(
      (fraudBuyersResult.data ?? [])
        .map((row: { user_id?: string | null }) => row.user_id)
        .filter(Boolean)
    );

    return NextResponse.json({
      metrics: {
        activeBuyers: activeBuyerIds.size,
        verifiedBuyers: verifiedBuyersResult.count ?? 0,
        archivedProjects: archivedProjectsResult.count ?? 0,
        archiveRate: Number(archiveRate.toFixed(3)),
        averageFirstResponseHours: avgResponseHours,
        averageFirstResponseLabel:
          avgResponseHours == null
            ? null
            : avgResponseHours < 2
              ? 'Under 2 hours'
              : avgResponseHours < 6
                ? 'Under 6 hours'
                : 'Over 6 hours',
        buyersUnderRestriction: restrictedBuyersResult.count ?? 0,
        projectsRestored: restoredProjectsResult.count ?? 0,
        fraudBuyers: fraudBuyerIds.size,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load buyer analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
