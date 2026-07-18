import type { SupabaseClient } from '@supabase/supabase-js';
import { recordArenaEvent, recordArenaMilestone } from './fetchArena';
import type { BuilderArenaSignals } from './calculator';

export async function syncArenaMilestonesFromSignals(
  supabaseAdmin: SupabaseClient,
  signals: BuilderArenaSignals
): Promise<void> {
  const checks: Array<{ key: string; met: boolean }> = [
    { key: 'first_solution', met: signals.publishedSolutions >= 1 },
    { key: 'first_review', met: signals.reviewCount >= 1 },
    { key: 'first_project', met: signals.completedCollabs >= 1 },
    {
      key: 'profile_complete',
      met: signals.hasHeadline && signals.hasBio && signals.hasAvatar && signals.techStackCount > 0,
    },
    { key: 'revenue_100', met: signals.totalEarningsUsd >= 100 },
    { key: 'revenue_1000', met: signals.totalEarningsUsd >= 1000 },
    { key: 'verified_builder', met: signals.isVerified },
  ];

  for (const check of checks) {
    if (check.met) {
      await recordArenaMilestone(supabaseAdmin, signals.builderId, check.key);
    }
  }
}

export async function onSolutionPublished(
  supabaseAdmin: SupabaseClient,
  builderId: string,
  serviceId: string
): Promise<void> {
  await recordArenaEvent(supabaseAdmin, builderId, 'solution_published', serviceId);
  await recordArenaMilestone(supabaseAdmin, builderId, 'first_solution');
}

export async function onProjectCompleted(
  supabaseAdmin: SupabaseClient,
  builderId: string,
  collabId: string
): Promise<void> {
  await recordArenaEvent(supabaseAdmin, builderId, 'project_completed', collabId);
  await recordArenaMilestone(supabaseAdmin, builderId, 'first_project');
}

export async function onReviewReceived(
  supabaseAdmin: SupabaseClient,
  builderId: string,
  reviewId: string
): Promise<void> {
  await recordArenaEvent(supabaseAdmin, builderId, 'review_received', reviewId);
  await recordArenaMilestone(supabaseAdmin, builderId, 'first_review');
}
