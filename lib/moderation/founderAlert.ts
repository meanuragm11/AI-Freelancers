import { supabaseAdmin } from '@/lib/founder/server';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { riskLevelFromScore } from './risk';

type FounderModerationAlertInput = {
  messageId: string;
  collabId: string;
  category: string;
  riskScore: number;
  confidenceScore: number;
  reason: string;
  contentPreview: string;
  chatModerationId?: string;
};

export async function createFounderModerationAlert(
  input: FounderModerationAlertInput
): Promise<void> {
  try {
    const risk = riskLevelFromScore(input.riskScore);

    if (input.category === 'safe' || risk === 'low') {
      console.log('[moderation] Founder alert skipped — safe/low risk', {
        messageId: input.messageId,
        category: input.category,
        risk,
      });
      return;
    }

    if (risk !== 'medium' && risk !== 'high' && risk !== 'critical') {
      return;
    }

    const { data: admins, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_admin', true);

    if (error) throw error;
    if (!admins?.length) {
      console.warn('[moderation] Founder Alert Created — no admin profiles found');
      return;
    }

    const preview =
      input.contentPreview.length > 120
        ? `${input.contentPreview.slice(0, 120)}…`
        : input.contentPreview;

    const title = `Chat flagged (${risk}): ${input.category.replace(/_/g, ' ')}`;
    const message = `${preview} — ${input.reason}`;

    await Promise.all(
      admins.map((admin) =>
        sendNotification({
          type: NotificationType.SYSTEM,
          recipientId: admin.id,
          title,
          message,
          link: '/founder/moderation',
          metadata: {
            messageId: input.messageId,
            collabId: input.collabId,
            chatModerationId: input.chatModerationId,
            category: input.category,
            riskScore: input.riskScore,
            confidenceScore: input.confidenceScore,
            riskLevel: risk,
            idempotencyKey: `moderation-chat-${input.messageId}`,
          },
        })
      )
    );

    console.log('[moderation] Founder Alert Created', {
      messageId: input.messageId,
      collabId: input.collabId,
      category: input.category,
      risk,
      adminCount: admins.length,
    });
  } catch (error) {
    console.error('[moderation] Founder alert failed (non-blocking):', error);
  }
}

type FounderProjectReviewAlertInput = {
  projectId: string;
  buyerId: string;
  title: string;
  description: string;
  domain: string;
  confidence: number;
  reason: string;
  projectModerationId?: string;
};

export async function createFounderProjectReviewAlert(
  input: FounderProjectReviewAlertInput
): Promise<void> {
  try {
    const { data: admins, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_admin', true);

    if (error) throw error;
    if (!admins?.length) {
      console.warn('[moderation] Founder project review alert — no admin profiles found');
      return;
    }

    const domainLabel = input.domain.replace(/_/g, ' ');
    const preview =
      input.description.length > 120
        ? `${input.description.slice(0, 120)}…`
        : input.description;

    const title = `Project domain review: ${domainLabel}`;
    const message = `"${input.title}" — ${preview} (${input.confidence}% confidence). ${input.reason}`;

    await Promise.all(
      admins.map((admin) =>
        sendNotification({
          type: NotificationType.SYSTEM,
          recipientId: admin.id,
          title,
          message,
          link: '/founder/moderation?type=project&status=flagged',
          metadata: {
            projectId: input.projectId,
            buyerId: input.buyerId,
            projectModerationId: input.projectModerationId,
            domain: input.domain,
            confidence: input.confidence,
            idempotencyKey: `moderation-project-${input.projectId}`,
          },
        })
      )
    );

    console.log('[moderation] Founder project review alert created', {
      projectId: input.projectId,
      domain: input.domain,
      adminCount: admins.length,
    });
  } catch (error) {
    console.error('[moderation] Founder project review alert failed (non-blocking):', error);
  }
}
