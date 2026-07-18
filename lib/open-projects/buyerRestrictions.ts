import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/server/supabase';
import {
  INACTIVE_BUYER_ARCHIVE_RATE_THRESHOLD,
  INACTIVE_BUYER_MAX_PUBLIC_PROJECTS,
  INACTIVE_BUYER_MIN_PUBLISHED,
  INACTIVE_BUYER_RELEASE_ARCHIVE_RATE,
  INACTIVE_BUYER_RESTRICTION_DAYS,
  INACTIVE_BUYER_WINDOW_DAYS,
  ARCHIVE_REASON_INACTIVITY,
  REPEATED_RESTRICTION_THRESHOLD,
  REPEATED_RESTRICTION_WINDOW_DAYS,
} from './buyerPublishingConstants';
import { isProjectPubliclyVisible } from './activityMonitoring';
import { logMarketplaceAudit } from './limits';

export type BuyerPublishingLimitCheck = {
  canPublish: boolean;
  activePublicCount: number;
  activePublicLimit: number | null;
  limitReached: boolean;
  isVerifiedBuyer: boolean;
  isRestricted: boolean;
  restrictionUntil: string | null;
  requiresFounderApproval: boolean;
  reason?: string;
};

const PUBLIC_ACTIVE_STATUSES = ['published', 'receiving_proposals', 'negotiating'] as const;

export async function countActivePublicProjects(
  supabase: SupabaseClient,
  buyerId: string,
  excludeProjectId?: string
): Promise<number> {
  let query = supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', buyerId)
    .is('deleted_at', null)
    .in('status', [...PUBLIC_ACTIVE_STATUSES]);

  if (excludeProjectId) {
    query = query.neq('id', excludeProjectId);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function getBuyerPublishingProfile(
  supabase: SupabaseClient,
  buyerId: string
): Promise<{
  verifiedBuyer: boolean;
  restrictedUntil: string | null;
  restrictionStartedAt: string | null;
  requiresFounderApproval: boolean;
}> {
  const { data } = await supabase
    .from('profiles')
    .select(
      'verified_buyer, inactive_buyer_restricted_until, inactive_buyer_restriction_started_at, requires_founder_publish_approval'
    )
    .eq('id', buyerId)
    .maybeSingle();

  return {
    verifiedBuyer: Boolean(data?.verified_buyer),
    restrictedUntil: data?.inactive_buyer_restricted_until ?? null,
    restrictionStartedAt: data?.inactive_buyer_restriction_started_at ?? null,
    requiresFounderApproval: Boolean(data?.requires_founder_publish_approval),
  };
}

async function countRecentRestrictionEvents(
  admin: SupabaseClient,
  buyerId: string
): Promise<number> {
  const windowStart = new Date(
    Date.now() - REPEATED_RESTRICTION_WINDOW_DAYS * 86400000
  ).toISOString();

  const { count } = await admin
    .from('buyer_inactivity_restriction_events')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', buyerId)
    .gte('applied_at', windowStart);

  return count ?? 0;
}

async function maybeRequireFounderApproval(
  admin: SupabaseClient,
  buyerId: string
): Promise<void> {
  const recentCount = await countRecentRestrictionEvents(admin, buyerId);
  if (recentCount < REPEATED_RESTRICTION_THRESHOLD) return;

  await admin
    .from('profiles')
    .update({ requires_founder_publish_approval: true })
    .eq('id', buyerId);

  await admin.from('buyer_marketplace_limits').upsert({
    buyer_id: buyerId,
    requires_founder_publish_approval: true,
    updated_at: new Date().toISOString(),
  });

  await logMarketplaceAudit(admin, {
    entity_type: 'buyer',
    entity_id: buyerId,
    action: 'founder_publish_approval_required',
    metadata: { restriction_events_180d: recentCount },
  });
}

export async function approveBuyerPublishing(
  admin: SupabaseClient,
  buyerId: string,
  founderId: string
): Promise<void> {
  const now = new Date().toISOString();

  await admin
    .from('profiles')
    .update({
      requires_founder_publish_approval: false,
      founder_publish_approval_at: now,
      founder_publish_approved_by: founderId,
      inactive_buyer_restricted_until: null,
      inactive_buyer_restriction_started_at: null,
    })
    .eq('id', buyerId);

  await admin.from('buyer_marketplace_limits').upsert({
    buyer_id: buyerId,
    requires_founder_publish_approval: false,
    founder_publish_approval_at: now,
    inactive_restriction_until: null,
    inactive_restriction_started_at: null,
    updated_at: now,
  });

  await logMarketplaceAudit(admin, {
    entity_type: 'buyer',
    entity_id: buyerId,
    action: 'founder_publish_approval_granted',
    actor_id: founderId,
  });
}

export async function checkBuyerPublishingLimits(
  supabase: SupabaseClient,
  buyerId: string,
  excludeProjectId?: string
): Promise<BuyerPublishingLimitCheck> {
  const profile = await getBuyerPublishingProfile(supabase, buyerId);
  const activePublicCount = await countActivePublicProjects(supabase, buyerId, excludeProjectId);

  if (profile.verifiedBuyer) {
    return {
      canPublish: true,
      activePublicCount,
      activePublicLimit: null,
      limitReached: false,
      isVerifiedBuyer: true,
      isRestricted: false,
      restrictionUntil: null,
      requiresFounderApproval: false,
    };
  }

  const now = Date.now();
  const restrictedUntilMs = profile.restrictedUntil
    ? new Date(profile.restrictedUntil).getTime()
    : null;
  const timedRestrictionActive =
    restrictedUntilMs != null && restrictedUntilMs > now;
  const underPublishingCap =
    timedRestrictionActive || profile.requiresFounderApproval;

  if (!underPublishingCap) {
    return {
      canPublish: true,
      activePublicCount,
      activePublicLimit: null,
      limitReached: false,
      isVerifiedBuyer: false,
      isRestricted: false,
      restrictionUntil: null,
      requiresFounderApproval: false,
    };
  }

  const limitReached = activePublicCount >= INACTIVE_BUYER_MAX_PUBLIC_PROJECTS;
  const reason = profile.requiresFounderApproval
    ? limitReached
      ? 'Your account requires founder approval before publishing more than 3 active public projects due to repeated inactivity restrictions. Contact support or wait for approval in Command Center.'
      : undefined
    : limitReached
      ? `Your account has a temporary publishing limit of ${INACTIVE_BUYER_MAX_PUBLIC_PROJECTS} active public projects until ${new Date(profile.restrictedUntil!).toLocaleDateString()}. Close or engage with existing projects before publishing another.`
      : undefined;

  return {
    canPublish: !limitReached,
    activePublicCount,
    activePublicLimit: INACTIVE_BUYER_MAX_PUBLIC_PROJECTS,
    limitReached,
    isVerifiedBuyer: false,
    isRestricted: true,
    restrictionUntil: profile.restrictedUntil,
    requiresFounderApproval: profile.requiresFounderApproval,
    reason,
  };
}

/** @deprecated Use checkBuyerPublishingLimits */
export async function checkBuyerProjectLimits(
  supabase: SupabaseClient,
  buyerId: string,
  excludeProjectId?: string
): Promise<BuyerPublishingLimitCheck & { activeCount: number; activeLimit: number | null }> {
  const result = await checkBuyerPublishingLimits(supabase, buyerId, excludeProjectId);
  return {
    ...result,
    activeCount: result.activePublicCount,
    activeLimit: result.activePublicLimit,
  };
}

export async function evaluateInactiveBuyerStatus(
  supabase: SupabaseClient,
  buyerId: string
): Promise<{ restricted: boolean; released: boolean }> {
  const admin = createSupabaseAdminClient();
  const profile = await getBuyerPublishingProfile(admin, buyerId);
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - INACTIVE_BUYER_WINDOW_DAYS * 86400000
  ).toISOString();

  const { data: recentProjects } = await admin
    .from('projects')
    .select('id, status, archive_reason, published_at')
    .eq('buyer_id', buyerId)
    .is('deleted_at', null)
    .not('published_at', 'is', null)
    .gte('published_at', windowStart);

  const published = recentProjects ?? [];
  const publishedCount = published.length;

  const inactivityArchived = published.filter(
    (p) => p.status === 'archived' && p.archive_reason === ARCHIVE_REASON_INACTIVITY
  ).length;

  const archiveRate = publishedCount > 0 ? inactivityArchived / publishedCount : 0;

  const restrictedUntilMs = profile.restrictedUntil
    ? new Date(profile.restrictedUntil).getTime()
    : null;
  const currentlyRestricted = restrictedUntilMs != null && restrictedUntilMs > now.getTime();
  const restrictionExpired = restrictedUntilMs != null && restrictedUntilMs <= now.getTime();

  if (restrictionExpired && !profile.requiresFounderApproval) {
    if (archiveRate < INACTIVE_BUYER_RELEASE_ARCHIVE_RATE) {
      await admin
        .from('profiles')
        .update({
          inactive_buyer_restricted_until: null,
          inactive_buyer_restriction_started_at: null,
        })
        .eq('id', buyerId);

      await admin
        .from('buyer_inactivity_restriction_events')
        .update({ released_at: now.toISOString() })
        .eq('buyer_id', buyerId)
        .is('released_at', null);

      await admin.from('buyer_marketplace_limits').upsert({
        buyer_id: buyerId,
        inactive_restriction_until: null,
        inactive_restriction_started_at: null,
        updated_at: now.toISOString(),
      });

      await logMarketplaceAudit(supabase, {
        entity_type: 'buyer',
        entity_id: buyerId,
        action: 'inactive_restriction_released',
        metadata: { archive_rate: archiveRate },
      });

      return { restricted: false, released: true };
    }

    const until = new Date(
      now.getTime() + INACTIVE_BUYER_RESTRICTION_DAYS * 86400000
    ).toISOString();

    await admin
      .from('profiles')
      .update({ inactive_buyer_restricted_until: until })
      .eq('id', buyerId);

    await admin.from('buyer_marketplace_limits').upsert({
      buyer_id: buyerId,
      inactive_restriction_until: until,
      updated_at: now.toISOString(),
    });

    return { restricted: true, released: false };
  }

  if (
    !profile.verifiedBuyer &&
    !currentlyRestricted &&
    !profile.requiresFounderApproval &&
    publishedCount >= INACTIVE_BUYER_MIN_PUBLISHED &&
    archiveRate >= INACTIVE_BUYER_ARCHIVE_RATE_THRESHOLD
  ) {
    const until = new Date(
      now.getTime() + INACTIVE_BUYER_RESTRICTION_DAYS * 86400000
    ).toISOString();

    await admin
      .from('profiles')
      .update({
        inactive_buyer_restricted_until: until,
        inactive_buyer_restriction_started_at: now.toISOString(),
      })
      .eq('id', buyerId);

    await admin.from('buyer_marketplace_limits').upsert({
      buyer_id: buyerId,
      inactive_restriction_until: until,
      inactive_restriction_started_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    await admin.from('buyer_inactivity_restriction_events').insert({
      buyer_id: buyerId,
      archive_rate: archiveRate,
      published_count: publishedCount,
      metadata: { restricted_until: until },
    });

    await maybeRequireFounderApproval(admin, buyerId);

    await logMarketplaceAudit(supabase, {
      entity_type: 'buyer',
      entity_id: buyerId,
      action: 'inactive_restriction_applied',
      metadata: {
        published_count: publishedCount,
        inactivity_archived: inactivityArchived,
        archive_rate: archiveRate,
        restricted_until: until,
      },
    });

    return { restricted: true, released: false };
  }

  return {
    restricted: currentlyRestricted || profile.requiresFounderApproval,
    released: false,
  };
}

export { isProjectPubliclyVisible, PUBLIC_ACTIVE_STATUSES };
