import type { SupabaseClient } from '@supabase/supabase-js';
import { gatherBuilderSignals } from '../calculator';
import { syncArenaMilestonesFromSignals } from '../hooks';
import {
  evaluateAllBadges,
  type BadgeMomentumSignals,
} from './evaluators';
import { computeNextBadgeHint } from './hints';
import {
  getPrimaryBadge,
  RECOGNITION_BADGES,
  sortBadgesByPriority,
  type BuilderRecognitionSnapshot,
  type RecognitionBadgeGrant,
  type RecognitionBadgeKey,
} from './types';

export { getPrimaryBadge, sortBadgesByPriority } from './types';

async function gatherMomentumSignals(
  supabaseAdmin: SupabaseClient,
  builderId: string
): Promise<BadgeMomentumSignals> {
  const now = Date.now();
  const recentStart = new Date(now - 30 * 86_400_000).toISOString();
  const priorStart = new Date(now - 60 * 86_400_000).toISOString();

  const [
    recentEventsRes,
    priorEventsRes,
    servicesRes,
    savedRes,
    proposalsRes,
    projectRequestsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('arena_events')
      .select('event_type, created_at')
      .eq('builder_id', builderId)
      .gte('created_at', recentStart),
    supabaseAdmin
      .from('arena_events')
      .select('event_type, created_at')
      .eq('builder_id', builderId)
      .gte('created_at', priorStart)
      .lt('created_at', recentStart),
    supabaseAdmin
      .from('services')
      .select('view_count, sales_count')
      .eq('builder_id', builderId)
      .eq('status', 'published'),
    supabaseAdmin
      .from('saved_experts')
      .select('id')
      .eq('expert_id', builderId),
    supabaseAdmin
      .from('project_proposals')
      .select('id, status, updated_at')
      .eq('builder_id', builderId)
      .gte('updated_at', recentStart),
    supabaseAdmin
      .from('project_requests')
      .select('id, created_at')
      .eq('builder_id', builderId)
      .gte('created_at', recentStart),
  ]);

  const recentEvents = recentEventsRes.error ? [] : recentEventsRes.data ?? [];
  const priorEvents = priorEventsRes.error ? [] : priorEventsRes.data ?? [];

  const countEvents = (events: { event_type: string }[], type: string) =>
    events.filter((e) => e.event_type === type).length;

  const services = servicesRes.error ? [] : servicesRes.data ?? [];
  const totalServiceViews = services.reduce(
    (sum, s) => sum + Number(s.view_count ?? 0),
    0
  );

  const recentProposalAcceptances =
    (!proposalsRes.error ? proposalsRes.data : [])?.filter((p) =>
      ['accepted', 'hired'].includes((p.status ?? '').toLowerCase())
    ).length ?? 0;

  return {
    recentProfileViews: countEvents(recentEvents, 'profile_view'),
    priorProfileViews: countEvents(priorEvents, 'profile_view'),
    recentInvitations:
      countEvents(recentEvents, 'referral') +
      (!projectRequestsRes.error ? projectRequestsRes.data?.length ?? 0 : 0),
    priorInvitations: countEvents(priorEvents, 'referral'),
    recentReviews: countEvents(recentEvents, 'review_received'),
    recentActivityEvents: recentEvents.length,
    totalServiceViews,
    savedExpertCount: savedRes.error ? 0 : savedRes.data?.length ?? 0,
    recentProposalAcceptances,
  };
}

function toBadgeGrant(
  key: RecognitionBadgeKey,
  source: 'auto' | 'admin' = 'auto'
): RecognitionBadgeGrant {
  const def = RECOGNITION_BADGES[key];
  return {
    ...def,
    grantedAt: new Date().toISOString(),
    source,
  };
}

export async function computeBuilderBadges(
  supabaseAdmin: SupabaseClient,
  builderId: string,
  options?: { persist?: boolean }
): Promise<BuilderRecognitionSnapshot | null> {
  const signals = await gatherBuilderSignals(supabaseAdmin, builderId);
  if (!signals) return null;

  await syncArenaMilestonesFromSignals(supabaseAdmin, signals).catch(() => {});

  const { data: profileRow } = await supabaseAdmin
    .from('profiles')
    .select('editors_pick')
    .eq('id', builderId)
    .maybeSingle();

  const momentum = await gatherMomentumSignals(supabaseAdmin, builderId);
  const ctx = {
    signals,
    momentum,
    editorsPick: Boolean(profileRow?.editors_pick),
  };

  const earnedKeys = evaluateAllBadges(ctx);
  const badges = sortBadgesByPriority(
    earnedKeys.map((key) =>
      toBadgeGrant(key, key === 'editors_pick' ? 'admin' : 'auto')
    )
  );

  if (options?.persist !== false) {
    await persistBuilderBadges(supabaseAdmin, builderId, earnedKeys, ctx.editorsPick);
  }

  return {
    builderId,
    badges,
    primaryBadge: getPrimaryBadge(badges),
    nextBadge: computeNextBadgeHint(ctx, new Set(earnedKeys)),
  };
}

async function persistBuilderBadges(
  supabaseAdmin: SupabaseClient,
  builderId: string,
  earnedKeys: RecognitionBadgeKey[],
  editorsPick: boolean
): Promise<void> {
  const autoKeys = earnedKeys.filter((k) => k !== 'editors_pick');

  await supabaseAdmin
    .from('builder_recognition_badges')
    .delete()
    .eq('builder_id', builderId)
    .eq('source', 'auto');

  if (autoKeys.length > 0) {
    await supabaseAdmin.from('builder_recognition_badges').upsert(
      autoKeys.map((badge_key) => ({
        builder_id: builderId,
        badge_key,
        source: 'auto',
        granted_at: new Date().toISOString(),
      })),
      { onConflict: 'builder_id,badge_key' }
    );
  }

  if (editorsPick) {
    await supabaseAdmin.from('builder_recognition_badges').upsert(
      {
        builder_id: builderId,
        badge_key: 'editors_pick',
        source: 'admin',
        granted_at: new Date().toISOString(),
      },
      { onConflict: 'builder_id,badge_key' }
    );
  } else {
    await supabaseAdmin
      .from('builder_recognition_badges')
      .delete()
      .eq('builder_id', builderId)
      .eq('badge_key', 'editors_pick');
  }
}

export async function fetchCachedBuilderBadges(
  supabaseAdmin: SupabaseClient,
  builderId: string
): Promise<RecognitionBadgeGrant[]> {
  const { data: rows } = await supabaseAdmin
    .from('builder_recognition_badges')
    .select('badge_key, source, granted_at')
    .eq('builder_id', builderId);

  if (!rows?.length) {
    const computed = await computeBuilderBadges(supabaseAdmin, builderId);
    return computed?.badges ?? [];
  }

  return sortBadgesByPriority(
    rows.map((row) => ({
      ...RECOGNITION_BADGES[row.badge_key as RecognitionBadgeKey],
      grantedAt: row.granted_at,
      source: row.source as 'auto' | 'admin',
    }))
  );
}

export async function fetchBuildersRecognitionBatch(
  supabaseAdmin: SupabaseClient,
  builderIds: string[]
): Promise<Record<string, RecognitionBadgeGrant[]>> {
  const uniqueIds = [...new Set(builderIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const { data: rows } = await supabaseAdmin
    .from('builder_recognition_badges')
    .select('builder_id, badge_key, source, granted_at')
    .in('builder_id', uniqueIds);

  const map: Record<string, RecognitionBadgeGrant[]> = {};
  for (const id of uniqueIds) {
    map[id] = [];
  }

  for (const row of rows ?? []) {
    const key = row.badge_key as RecognitionBadgeKey;
    if (!RECOGNITION_BADGES[key]) continue;
    map[row.builder_id] = map[row.builder_id] ?? [];
    map[row.builder_id].push({
      ...RECOGNITION_BADGES[key],
      grantedAt: row.granted_at,
      source: row.source as 'auto' | 'admin',
    });
  }

  for (const id of uniqueIds) {
    map[id] = sortBadgesByPriority(map[id] ?? []);
    if (map[id].length === 0) {
      const computed = await computeBuilderBadges(supabaseAdmin, id);
      map[id] = computed?.badges ?? [];
    }
  }

  return map;
}

export async function recomputeAllBuilderBadges(
  supabaseAdmin: SupabaseClient
): Promise<number> {
  const { data: freelancers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('is_freelancer', true);

  let count = 0;
  for (const row of freelancers ?? []) {
    await computeBuilderBadges(supabaseAdmin, row.id);
    count += 1;
  }
  return count;
}
