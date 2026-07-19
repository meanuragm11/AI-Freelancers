import { createClient } from '@supabase/supabase-js';

import { formatDisplayName } from '@/lib/display/formatDisplayName';
import { sanitizeEmailText } from '@/lib/notifications/emailContent';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';import { queueChatModerationFromMessageId } from '@/lib/moderation/queueFromMessage';



const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);



function formatPreview(text: string): string {
  const sanitized = sanitizeEmailText(text);
  if (sanitized) return sanitized.slice(0, 200);
  return 'New message';
}


export async function sendMessageNotificationForMessage(
  messageId: string
): Promise<{ ok: boolean; skipped?: string }> {
  const { data: message, error: messageError } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, collab_id, text, content, deleted_at')
    .eq('id', messageId)
    .single();

  if (messageError || !message || message.deleted_at) {
    return { ok: false, skipped: 'message_not_found' };
  }

  const { data: collab, error: collabError } = await supabaseAdmin
    .from('collabs')
    .select('id, title, buyer_id, builder_id')
    .eq('id', message.collab_id)
    .single();

  if (collabError || !collab) {
    return { ok: false, skipped: 'collab_not_found' };
  }

  const recipientId =
    collab.buyer_id === message.sender_id ? collab.builder_id : collab.buyer_id;

  if (!recipientId) {
    return { ok: true, skipped: 'no_recipient' };
  }

  const { data: senderProfile } = await supabaseAdmin
    .from('profiles_public').select('full_name').eq('id', message.sender_id).single();

  const inboxLink =
    collab.buyer_id === recipientId ? '/buyer/messages' : '/builder/inbox';

  const senderName = formatDisplayName(senderProfile?.full_name || 'Someone');
  const preview = formatPreview(message.text || message.content || '');

  const result = await sendNotification({
    type: NotificationType.NEW_MESSAGE,
    recipientId,
    title: `New message from ${senderName}`,
    message: preview,
    link: inboxLink,
    metadata: {
      collabId: collab.id,
      conversationId: collab.id,
      projectName: collab.title || 'Your project',
      senderName,
    },
    skipDbInsert: true,
  });

  if (!result.success) {
    return { ok: false, skipped: result.error };
  }

  if (collab.buyer_id === message.sender_id) {
    const { trackBuyerMessageEngagement } = await import('@/lib/open-projects/buyerTrustSignals');
    void trackBuyerMessageEngagement(supabaseAdmin, {
      collabId: collab.id,
      buyerId: collab.buyer_id,
      builderId: collab.builder_id,
      messageContent: message.text || message.content || '',
    });
  }

  void queueChatModerationFromMessageId(messageId);

  return { ok: true, skipped: result.emailSkippedReason };
}

