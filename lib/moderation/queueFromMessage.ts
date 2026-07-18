import { supabaseAdmin } from '@/lib/founder/server';
import { queueChatModeration } from './runner';

/**
 * Fetch a user message and queue moderation. Safe to call fire-and-forget.
 */
export async function queueChatModerationFromMessageId(messageId: string): Promise<void> {
  try {
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .select('id, collab_id, sender_id, text, content, message_kind, deleted_at')
      .eq('id', messageId)
      .maybeSingle();

    if (error) throw error;
    if (!message || message.deleted_at) return;
    if (message.message_kind === 'system') return;

    const content = (message.text || message.content || '').trim();
    if (!content) return;

    queueChatModeration({
      messageId: message.id,
      collabId: message.collab_id,
      senderId: message.sender_id,
      content,
    });
  } catch (error) {
    console.error('[moderation] Failed to queue chat moderation from messageId:', messageId, error);
  }
}
