import type { SupabaseClient } from '@supabase/supabase-js';

export type MilestoneChatEvent = 'created' | 'funded' | 'released';

export function milestoneCardMessage(milestoneId: string, event: MilestoneChatEvent) {
  return `[[MILESTONE_CARD|${milestoneId}|${event}]]`;
}

export async function postMilestoneChatMessage(
  supabaseAdmin: SupabaseClient,
  params: {
    collabId: string;
    senderId: string;
    milestoneId: string;
    event: MilestoneChatEvent;
    title: string;
    amountUsd: number;
    platformFeeUsd?: number;
  }
) {
  const feeSuffix =
    params.platformFeeUsd && params.platformFeeUsd > 0
      ? ` · Platform fee $${params.platformFeeUsd.toLocaleString()}`
      : '';

  const eventLabel =
    params.event === 'created'
      ? 'New milestone added'
      : params.event === 'funded'
        ? 'Milestone funded'
        : 'Milestone released';

  const text = `${milestoneCardMessage(params.milestoneId, params.event)} ${eventLabel}: "${params.title}" · $${Number(params.amountUsd).toLocaleString()}${feeSuffix}`;

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      collab_id: params.collabId,
      sender_id: params.senderId,
      text,
      content: text,
      message_kind: 'system',
      system_event_type: `milestone_${params.event}`,
    })
    .select('id')
    .single();

  if (error) throw error;

  if (data?.id) {
    void import('@/lib/messageNotifications').then(({ sendMessageNotificationForMessage }) =>
      sendMessageNotificationForMessage(data.id)
    );
  }

  return data;
}
