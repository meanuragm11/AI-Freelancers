import type { SupabaseClient } from '@supabase/supabase-js';
import { MEANINGFUL_MESSAGE_MIN_LENGTH } from './buyerPublishingConstants';

const TRIVIAL_MESSAGE_PATTERNS = [
  /^hi+!*\.?$/i,
  /^hello+!*\.?$/i,
  /^hey+!*\.?$/i,
  /^thanks?\.?$/i,
  /^thank you\.?$/i,
  /^ok\.?$/i,
  /^okay\.?$/i,
];

export function isMeaningfulMessage(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < MEANINGFUL_MESSAGE_MIN_LENGTH) return false;
  if (trimmed.startsWith('[[')) return false;
  if (TRIVIAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  return true;
}

export async function trackBuyerMessageEngagement(
  admin: SupabaseClient,
  params: {
    collabId: string;
    buyerId: string;
    builderId: string;
    messageContent: string;
  }
): Promise<void> {
  if (!isMeaningfulMessage(params.messageContent)) return;

  const { data: projects } = await admin
    .from('projects')
    .select('id')
    .eq('buyer_id', params.buyerId)
    .in('status', ['published', 'receiving_proposals', 'negotiating'])
    .is('deleted_at', null);

  if (!projects?.length) return;

  const projectIds = projects.map((p) => p.id);
  const { data: proposals } = await admin
    .from('project_proposals')
    .select('id, project_id')
    .in('project_id', projectIds)
    .eq('builder_id', params.builderId)
    .is('deleted_at', null)
    .neq('status', 'draft');

  if (!proposals?.length) return;

  const { recordMeaningfulMessageActivity } = await import('./activityMonitoring');

  for (const proposal of proposals) {
    await recordMeaningfulMessageActivity(admin, {
      projectId: proposal.project_id,
      buyerId: params.buyerId,
      proposalId: proposal.id,
      messagePreview: params.messageContent.trim().slice(0, 120),
    });
  }
}

export type BuyerTrustSignals = {
  responseRatePercent: number | null;
  averageFirstResponseLabel: string | null;
};

export async function getBuyerTrustSignals(
  admin: SupabaseClient,
  buyerId: string
): Promise<BuyerTrustSignals> {
  const { data: buyerProjects } = await admin
    .from('projects')
    .select('id')
    .eq('buyer_id', buyerId)
    .is('deleted_at', null);

  const projectIds = (buyerProjects ?? []).map((project) => project.id);
  if (!projectIds.length) {
    return { responseRatePercent: null, averageFirstResponseLabel: null };
  }

  const { data: proposals } = await admin
    .from('project_proposals')
    .select('id, builder_id, created_at')
    .in('project_id', projectIds)
    .is('deleted_at', null)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!proposals?.length) {
    return { responseRatePercent: null, averageFirstResponseLabel: null };
  }

  const responseHours: number[] = [];
  let respondedCount = 0;

  for (const proposal of proposals) {
    const { data: collab } = await admin
      .from('collabs')
      .select('id')
      .eq('buyer_id', buyerId)
      .eq('builder_id', proposal.builder_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!collab?.id) continue;

    const { data: firstBuyerMessage } = await admin
      .from('messages')
      .select('created_at, text, content')
      .eq('collab_id', collab.id)
      .eq('sender_id', buyerId)
      .is('deleted_at', null)
      .gte('created_at', proposal.created_at)
      .order('created_at', { ascending: true })
      .limit(20);

    const meaningfulReply = (firstBuyerMessage ?? []).find((message) =>
      isMeaningfulMessage(message.text || message.content || '')
    );

    if (meaningfulReply) {
      respondedCount += 1;
      const hours =
        (new Date(meaningfulReply.created_at).getTime() -
          new Date(proposal.created_at).getTime()) /
        3600000;
      if (hours >= 0) responseHours.push(hours);
    }
  }

  const sampleSize = proposals.length;
  const responseRatePercent =
    sampleSize > 0 ? Math.round((respondedCount / sampleSize) * 100) : null;

  let averageFirstResponseLabel: string | null = null;
  if (responseHours.length > 0) {
    const avgHours = responseHours.reduce((sum, h) => sum + h, 0) / responseHours.length;
    if (avgHours < 1) averageFirstResponseLabel = 'Replies within 1 hour';
    else if (avgHours < 2) averageFirstResponseLabel = 'Replies within 2 hours';
    else if (avgHours < 6) averageFirstResponseLabel = 'Replies within 6 hours';
    else if (avgHours < 24) averageFirstResponseLabel = 'Replies within 24 hours';
    else averageFirstResponseLabel = 'Replies within a few days';
  }

  return { responseRatePercent, averageFirstResponseLabel };
}

function formatHoursLabel(hours: number): string {
  if (hours < 1) return 'Replies within 1 hour';
  if (hours < 2) return 'Replies within 2 hours';
  if (hours < 6) return 'Replies within 6 hours';
  if (hours < 24) return 'Replies within 24 hours';
  return 'Replies within a few days';
}

export async function getPlatformAverageFirstResponseHours(
  admin: SupabaseClient
): Promise<number | null> {
  const { data: recentProposals } = await admin
    .from('project_proposals')
    .select('id, builder_id, created_at, project:projects!inner(buyer_id)')
    .is('deleted_at', null)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(200);

  const responseHours: number[] = [];

  for (const proposal of recentProposals ?? []) {
    const buyerId = (proposal.project as { buyer_id?: string } | null)?.buyer_id;
    if (!buyerId) continue;

    const { data: collab } = await admin
      .from('collabs')
      .select('id')
      .eq('buyer_id', buyerId)
      .eq('builder_id', proposal.builder_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!collab?.id) continue;

    const { data: messages } = await admin
      .from('messages')
      .select('created_at, text, content')
      .eq('collab_id', collab.id)
      .eq('sender_id', buyerId)
      .is('deleted_at', null)
      .gte('created_at', proposal.created_at)
      .order('created_at', { ascending: true })
      .limit(20);

    const meaningfulReply = (messages ?? []).find((message) =>
      isMeaningfulMessage(message.text || message.content || '')
    );

    if (!meaningfulReply) continue;

    const hours =
      (new Date(meaningfulReply.created_at).getTime() -
        new Date(proposal.created_at).getTime()) /
      3600000;
    if (hours >= 0) responseHours.push(hours);
  }

  if (!responseHours.length) return null;
  return responseHours.reduce((sum, value) => sum + value, 0) / responseHours.length;
}

export { formatHoursLabel };
