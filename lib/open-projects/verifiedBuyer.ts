import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/server/supabase';
import {
  VERIFIED_BUYER_FRAUD_REVOKE_COUNT,
  VERIFIED_BUYER_MAJOR_VIOLATION_REVOKE_COUNT,
  VERIFIED_BUYER_MIN_ACCOUNT_DAYS,
  VERIFIED_BUYER_MIN_PAYMENT_USD,
  VERIFIED_BUYER_VIOLATION_WINDOW_DAYS,
} from './buyerPublishingConstants';
import { getBuyerTrustSignals } from './buyerTrustSignals';
import { logMarketplaceAudit } from './limits';

export type VerifiedBuyerEvaluation = {
  eligible: boolean;
  verified: boolean;
  reasons: string[];
};

async function countCompletedEscrowContracts(
  admin: SupabaseClient,
  buyerId: string
): Promise<number> {
  const { count } = await admin
    .from('collabs')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', buyerId)
    .in('status', ['completed', 'released']);

  return count ?? 0;
}

async function sumCompletedPayments(admin: SupabaseClient, buyerId: string): Promise<number> {
  const { data } = await admin
    .from('transactions')
    .select('amount_usd')
    .eq('buyer_id', buyerId)
    .in('status', ['completed', 'paid', 'captured']);

  return (data ?? []).reduce((sum, row) => sum + Number(row.amount_usd ?? 0), 0);
}

async function countConfirmedFraudCases(
  admin: SupabaseClient,
  buyerId: string,
  sinceIso: string
): Promise<number> {
  const { count } = await admin
    .from('moderation_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', buyerId)
    .eq('category', 'fraud')
    .in('status', ['flagged', 'blocked', 'reviewed'])
    .gte('created_at', sinceIso);

  return count ?? 0;
}

async function countMajorModerationViolations(
  admin: SupabaseClient,
  buyerId: string,
  sinceIso: string
): Promise<number> {
  const [{ count: suspensionCount }, { count: warningCount }] = await Promise.all([
    admin
      .from('user_moderation_suspensions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', buyerId)
      .in('suspension_type', ['7d_suspension', 'permanent_ban'])
      .gte('created_at', sinceIso),
    admin
      .from('user_moderation_warnings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', buyerId)
      .gte('created_at', sinceIso),
  ]);

  return (suspensionCount ?? 0) + Math.floor((warningCount ?? 0) / 2);
}

async function hasActiveModerationPenalty(admin: SupabaseClient, buyerId: string): Promise<boolean> {
  const { data: profile } = await admin
    .from('profiles')
    .select('account_status, suspension_type, suspension_expires_at')
    .eq('id', buyerId)
    .maybeSingle();

  if (!profile) return true;
  if (profile.account_status === 'banned') return true;
  if (profile.account_status === 'suspended') {
    if (!profile.suspension_expires_at) return true;
    if (new Date(profile.suspension_expires_at).getTime() > Date.now()) return true;
  }

  const { count } = await admin
    .from('user_moderation_suspensions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', buyerId)
    .is('lifted_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  return (count ?? 0) > 0;
}

export async function evaluateVerifiedBuyerStatus(
  supabase: SupabaseClient,
  buyerId: string
): Promise<VerifiedBuyerEvaluation> {
  const admin = createSupabaseAdminClient();
  const reasons: string[] = [];
  const violationWindowStart = new Date(
    Date.now() - VERIFIED_BUYER_VIOLATION_WINDOW_DAYS * 86400000
  ).toISOString();

  const { data: profile } = await admin
    .from('profiles')
    .select('verified_buyer, created_at, account_status')
    .eq('id', buyerId)
    .maybeSingle();

  if (!profile) {
    return { eligible: false, verified: false, reasons: ['Profile not found'] };
  }

  if (profile.account_status === 'banned') {
    await revokeVerifiedBuyer(admin, buyerId, 'permanent_suspension');
    return { eligible: false, verified: false, reasons: ['Account permanently suspended'] };
  }

  const [
    completedContracts,
    totalPaid,
    fraudCases,
    majorViolations,
    activePenalty,
  ] = await Promise.all([
    countCompletedEscrowContracts(admin, buyerId),
    sumCompletedPayments(admin, buyerId),
    countConfirmedFraudCases(admin, buyerId, violationWindowStart),
    countMajorModerationViolations(admin, buyerId, violationWindowStart),
    hasActiveModerationPenalty(admin, buyerId),
  ]);

  const accountAgeDays =
    (Date.now() - new Date(profile.created_at).getTime()) / 86400000;

  if (profile.verified_buyer) {
    if (fraudCases >= VERIFIED_BUYER_FRAUD_REVOKE_COUNT) {
      await revokeVerifiedBuyer(admin, buyerId, 'fraud_cases');
      return {
        eligible: false,
        verified: false,
        reasons: [`${fraudCases} confirmed fraud cases in the last 180 days`],
      };
    }
    if (majorViolations >= VERIFIED_BUYER_MAJOR_VIOLATION_REVOKE_COUNT) {
      await revokeVerifiedBuyer(admin, buyerId, 'major_violations');
      return {
        eligible: false,
        verified: false,
        reasons: [`${majorViolations} major moderation violations in the last 180 days`],
      };
    }
    return { eligible: true, verified: true, reasons: [] };
  }

  if (completedContracts < 1) reasons.push('No successfully completed escrow contracts');
  if (totalPaid < VERIFIED_BUYER_MIN_PAYMENT_USD) {
    reasons.push(`Total escrow payments below $${VERIFIED_BUYER_MIN_PAYMENT_USD}`);
  }
  if (accountAgeDays < VERIFIED_BUYER_MIN_ACCOUNT_DAYS) {
    reasons.push(`Account must be at least ${VERIFIED_BUYER_MIN_ACCOUNT_DAYS} days old`);
  }
  if (fraudCases > 0) reasons.push('Confirmed fraud on record');
  if (activePenalty) reasons.push('Active moderation penalty');

  const eligible = reasons.length === 0;

  if (eligible) {
    const now = new Date().toISOString();
    await admin
      .from('profiles')
      .update({ verified_buyer: true, verified_buyer_at: now })
      .eq('id', buyerId);

    await admin.from('buyer_marketplace_limits').upsert({
      buyer_id: buyerId,
      verified_buyer: true,
      verified_buyer_at: now,
      updated_at: now,
    });

    await logMarketplaceAudit(supabase, {
      entity_type: 'buyer',
      entity_id: buyerId,
      action: 'verified_buyer_granted',
    });

    return { eligible: true, verified: true, reasons: [] };
  }

  return { eligible: false, verified: false, reasons };
}

async function revokeVerifiedBuyer(
  admin: SupabaseClient,
  buyerId: string,
  reason: string
): Promise<void> {
  await admin
    .from('profiles')
    .update({ verified_buyer: false, verified_buyer_at: null })
    .eq('id', buyerId);

  await admin.from('buyer_marketplace_limits').upsert({
    buyer_id: buyerId,
    verified_buyer: false,
    verified_buyer_at: null,
    updated_at: new Date().toISOString(),
  });

  await logMarketplaceAudit(admin, {
    entity_type: 'buyer',
    entity_id: buyerId,
    action: 'verified_buyer_revoked',
    metadata: { reason },
  });
}

export async function processVerifiedBuyerBatch(limit = 100): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data: buyers } = await admin
    .from('projects')
    .select('buyer_id')
    .not('published_at', 'is', null)
    .limit(500);

  const uniqueBuyerIds = [...new Set((buyers ?? []).map((b) => b.buyer_id))].slice(0, limit);
  for (const buyerId of uniqueBuyerIds) {
    await evaluateVerifiedBuyerStatus(admin, buyerId);
  }
  return uniqueBuyerIds.length;
}

export async function getBuyerPublicStats(
  admin: SupabaseClient,
  buyerId: string
): Promise<{
  totalJobsPosted: number;
  totalSpentUsd: number;
  verifiedBuyer: boolean;
  memberSince: string;
  country: string | null;
  fullName: string | null;
  responseRatePercent: number | null;
  averageFirstResponseLabel: string | null;
}> {
  const [{ data: profile }, { count: jobsPosted }, totalSpent, trustSignals] = await Promise.all([
    admin
      .from('profiles_public')
      .select('full_name, created_at, location, verified_buyer')
      .eq('id', buyerId)
      .maybeSingle(),
    admin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', buyerId)
      .is('deleted_at', null)
      .not('published_at', 'is', null),
    sumCompletedPayments(admin, buyerId),
    getBuyerTrustSignals(admin, buyerId),
  ]);

  return {
    totalJobsPosted: jobsPosted ?? 0,
    totalSpentUsd: totalSpent,
    verifiedBuyer: Boolean(profile?.verified_buyer),
    memberSince: profile?.created_at ?? new Date().toISOString(),
    country: profile?.location ?? null,
    fullName: profile?.full_name ?? null,
    responseRatePercent: trustSignals.responseRatePercent,
    averageFirstResponseLabel: trustSignals.averageFirstResponseLabel,
  };
}
