import * as React from 'react';
import { createClient } from '@supabase/supabase-js';
import { formatDisplayName } from '@/lib/display/formatDisplayName';
import { resolveAppUrl } from '@/lib/urls/appUrl';
import { sendEmailViaResend } from './resend';
import {
  NotificationType,
  type EmailTemplateData,
  type SendNotificationParams,
  type SendNotificationResult,
} from './types';
import { NewMessageTemplate } from './templates/NewMessage';
import { ProjectRequestTemplate } from './templates/ProjectRequest';
import { QuotationTemplate } from './templates/Quotation';
import { EscrowFundedTemplate } from './templates/EscrowFunded';
import { MilestoneCreatedTemplate } from './templates/MilestoneCreated';
import { MilestoneApprovedTemplate } from './templates/MilestoneApproved';
import { ProjectCompletedTemplate } from './templates/ProjectCompleted';
import { ReviewReceivedTemplate } from './templates/ReviewReceived';
import { DisputeEventTemplate } from './templates/DisputeEvent';
import { ServicePurchasedTemplate } from './templates/ServicePurchased';
import { AssetPurchasedTemplate } from './templates/AssetPurchased';
import { SupportTicketTemplate } from './templates/SupportTicket';
import {
  buildEmailDescription,
  buildEmailHeading,
  buildEmailInfoItems,
  buildEmailSubject,
  buildEmailSummaryFields,
  getEmailPrimaryCtaLabel,
  getEmailPrimaryHref,
  getEmailSecondaryCtaLabel,
  getEmailSecondaryHref,
  summaryFieldsToRows,
} from './emailContent';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const EMAIL_THROTTLE_MS = 5 * 60 * 1000;

function logEvent(
  event: 'Notification Created' | 'Email Sent' | 'Email Failed' | 'Email Skipped',
  details: Record<string, unknown>
) {
  console.log(
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })
  );
}

function formatDateTime(date = new Date()) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getMetadataString(
  metadata: SendNotificationParams['metadata'],
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function maskMessageNotificationTitle(title: string): string {
  const match = title.match(/^New message from (.+)$/i);
  if (match?.[1]) {
    return `New message from ${formatDisplayName(match[1])}`;
  }
  return title;
}

function maskNotificationPrivacyFields(
  type: NotificationType,
  title: string,
  metadata: SendNotificationParams['metadata']
): { title: string; metadata: SendNotificationParams['metadata'] } {
  if (type !== NotificationType.NEW_MESSAGE) {
    return { title, metadata };
  }

  const maskedTitle = maskMessageNotificationTitle(title);
  const senderName = getMetadataString(metadata, 'senderName');
  if (!senderName) {
    return { title: maskedTitle, metadata };
  }

  return {
    title: maskedTitle,
    metadata: {
      ...metadata,
      senderName: formatDisplayName(senderName),
    },
  };
}

function buildEmailTemplateData(
  type: NotificationType,
  emailTitle: string,
  emailMessage: string,
  link: string | undefined,
  metadata: SendNotificationParams['metadata']
): EmailTemplateData {
  const dateTime = formatDateTime();
  const summaryFields = buildEmailSummaryFields(type, metadata, dateTime);
  const summaryRows = summaryFieldsToRows(summaryFields);

  return {
    type,
    heading: buildEmailHeading(type, emailTitle, metadata),
    projectName: getMetadataString(metadata, 'projectName'),
    projectStatus: getMetadataString(metadata, 'projectStatus'),
    dateTime,
    content: buildEmailDescription(type, emailMessage, metadata),
    primaryCtaLabel: getEmailPrimaryCtaLabel(type),
    primaryCtaHref: resolveAppUrl(getEmailPrimaryHref(type, link)),
    secondaryCtaLabel: getEmailSecondaryCtaLabel(type),
    secondaryCtaHref: resolveAppUrl(getEmailSecondaryHref(metadata)),
    summaryFields,
    summaryRows,
    infoItems: buildEmailInfoItems(type),
  };
}

export async function resolveRecipientEmail(recipientId: string): Promise<string | null> {
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(recipientId);
  if (authUser.user?.email) return authUser.user.email;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', recipientId)
    .single();

  return profile?.email ?? null;
}

async function isRecipientOnline(recipientId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_presence')
    .select('last_seen_at, is_online')
    .eq('user_id', recipientId)
    .maybeSingle();

  if (!data) return false;

  const lastSeen = new Date(data.last_seen_at).getTime();
  if (Number.isNaN(lastSeen)) return false;

  const recentlySeen = Date.now() - lastSeen < ONLINE_THRESHOLD_MS;
  return Boolean(data.is_online) && recentlySeen;
}

async function isEmailThrottled(
  recipientId: string,
  conversationId: string | undefined,
  notificationType: NotificationType
): Promise<boolean> {
  if (!conversationId || notificationType !== NotificationType.NEW_MESSAGE) return false;

  const since = new Date(Date.now() - EMAIL_THROTTLE_MS).toISOString();
  const { data } = await supabaseAdmin
    .from('notification_email_log')
    .select('id')
    .eq('recipient_id', recipientId)
    .eq('conversation_id', conversationId)
    .eq('notification_type', notificationType)
    .gte('sent_at', since)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function isEmailAllowedByPreferences(
  recipientId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('notification_preferences')
    .select('direct_messages_email, milestones_email, purchases_email, disputes_email, marketing_email')
    .eq('user_id', recipientId)
    .maybeSingle();

  if (!data) return true;

  switch (notificationType) {
    case NotificationType.NEW_MESSAGE:
      return data.direct_messages_email !== false;
    case NotificationType.ESCROW_FUNDED:
    case NotificationType.MILESTONE_PROPOSED:
    case NotificationType.MILESTONE_FUNDED:
    case NotificationType.MILESTONE_SUBMITTED:
    case NotificationType.MILESTONE_APPROVED:
    case NotificationType.PROJECT_COMPLETED:
    case NotificationType.REVIEW_RECEIVED:
      return data.milestones_email !== false;
    case NotificationType.SERVICE_PURCHASED:
    case NotificationType.AI_ASSET_PURCHASED:
    case NotificationType.CUSTOM_PROJECT_REQUEST:
    case NotificationType.NEW_QUOTATION:
    case NotificationType.QUOTATION_ACCEPTED:
      return data.purchases_email !== false;
    case NotificationType.DISPUTE_EVENT:
    case NotificationType.REFUND_EVENT:
      return data.disputes_email !== false;
    default:
      return true;
  }
}

async function recordEmailSent(
  recipientId: string,
  conversationId: string | undefined,
  notificationType: NotificationType
) {
  await supabaseAdmin.from('notification_email_log').insert({
    recipient_id: recipientId,
    conversation_id: conversationId ?? null,
    notification_type: notificationType,
  });
}

async function getBundledMessageContent(
  recipientId: string,
  conversationId: string | undefined,
  fallbackMessage: string
): Promise<{ title: string; message: string; unreadCount: number }> {
  let unreadQuery = supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', recipientId)
    .eq('type', NotificationType.NEW_MESSAGE)
    .eq('is_read', false);

  if (conversationId) {
    unreadQuery = unreadQuery.contains('metadata', { conversationId });
  }

  const { count } = await unreadQuery;
  const unreadCount = count ?? 1;

  if (unreadCount <= 1) {
    return { title: 'New message', message: fallbackMessage, unreadCount: 1 };
  }

  const scope = conversationId ? 'this conversation' : 'your inbox';
  return {
    title: `${unreadCount} new messages`,
    message: `You have ${unreadCount} unread messages in ${scope}. Open your inbox to read and reply.`,
    unreadCount,
  };
}

function renderTemplate(type: NotificationType, data: EmailTemplateData): React.ReactElement {
  const templateMap: Record<NotificationType, React.ComponentType<EmailTemplateData>> = {
    [NotificationType.NEW_MESSAGE]: NewMessageTemplate,
    [NotificationType.CUSTOM_PROJECT_REQUEST]: ProjectRequestTemplate,
    [NotificationType.NEW_QUOTATION]: QuotationTemplate,
    [NotificationType.QUOTATION_ACCEPTED]: QuotationTemplate,
    [NotificationType.ESCROW_FUNDED]: EscrowFundedTemplate,
    [NotificationType.MILESTONE_PROPOSED]: MilestoneCreatedTemplate,
    [NotificationType.MILESTONE_FUNDED]: EscrowFundedTemplate,
    [NotificationType.MILESTONE_SUBMITTED]: MilestoneCreatedTemplate,
    [NotificationType.MILESTONE_APPROVED]: MilestoneApprovedTemplate,
    [NotificationType.PROJECT_COMPLETED]: ProjectCompletedTemplate,
    [NotificationType.REVIEW_RECEIVED]: ReviewReceivedTemplate,
    [NotificationType.DISPUTE_EVENT]: DisputeEventTemplate,
    [NotificationType.REFUND_EVENT]: DisputeEventTemplate,
    [NotificationType.SERVICE_PURCHASED]: ServicePurchasedTemplate,
    [NotificationType.AI_ASSET_PURCHASED]: AssetPurchasedTemplate,
    [NotificationType.SUPPORT_TICKET]: SupportTicketTemplate,
    [NotificationType.OPEN_PROJECT_PROPOSAL]: ProjectRequestTemplate,
    [NotificationType.OPEN_PROJECT_HIRED]: ProjectCompletedTemplate,
    [NotificationType.OPEN_PROJECT_PROPOSAL_REJECTED]: ProjectRequestTemplate,
    [NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_1]: ProjectRequestTemplate,
    [NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_2]: ProjectRequestTemplate,
    [NotificationType.OPEN_PROJECT_AUTO_ARCHIVED]: ProjectRequestTemplate,
    [NotificationType.SYSTEM]: SupportTicketTemplate,
  };

  return React.createElement(templateMap[type], data);
}

export async function sendNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  const {
    type,
    recipientId,
    recipientEmail: providedEmail,
    title: rawTitle,
    message,
    link,
    metadata: rawMetadata = {},
    skipDbInsert = false,
  } = params;

  const { title, metadata } = maskNotificationPrivacyFields(type, rawTitle, rawMetadata);

  const conversationId =
    getMetadataString(metadata, 'conversationId') ?? getMetadataString(metadata, 'collabId');
  let notificationId: string | undefined;
  let duplicateNotification = false;

  if (!skipDbInsert) {
    const idempotencyKey = getMetadataString(metadata, 'idempotencyKey');

    if (idempotencyKey) {
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', recipientId)
        .eq('type', type)
        .contains('metadata', { idempotencyKey })
        .maybeSingle();

      notificationId = existing?.id;
      duplicateNotification = Boolean(existing?.id);
    }

    const insertResult = notificationId
      ? { data: { id: notificationId }, error: null }
      : await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: recipientId,
            type,
            title,
            message,
            link: link ?? null,
            is_read: false,
            metadata,
          })
          .select('id')
          .single();

    const { data: inserted, error: insertError } = insertResult;

    if (insertError) {
      logEvent('Email Failed', {
        recipientId,
        notificationType: type,
        stage: 'db_insert',
        error: insertError.message,
      });
      return {
        success: false,
        emailSent: false,
        error: insertError.message,
      };
    }

    notificationId = inserted.id;
    logEvent('Notification Created', {
      recipientId,
      notificationType: type,
      notificationId,
      duplicate: duplicateNotification,
    });

    if (duplicateNotification) {
      logEvent('Email Skipped', {
        recipientId,
        notificationType: type,
        reason: 'duplicate',
      });

      return {
        success: true,
        notificationId,
        emailSent: false,
        emailSkippedReason: 'duplicate',
      };
    }
  } else {
    logEvent('Notification Created', {
      recipientId,
      notificationType: type,
      source: 'existing_db_record',
    });
  }

  try {
    const emailAllowed = await isEmailAllowedByPreferences(recipientId, type);
    if (!emailAllowed) {
      logEvent('Email Skipped', {
        recipientId,
        notificationType: type,
        reason: 'recipient_preferences',
      });

      return {
        success: true,
        notificationId,
        emailSent: false,
        emailSkippedReason: 'recipient_preferences',
      };
    }

    const recipientEmail = providedEmail ?? (await resolveRecipientEmail(recipientId));
    if (!recipientEmail) {
      logEvent('Email Skipped', {
        recipientId,
        notificationType: type,
        reason: 'no_email',
      });
      return {
        success: true,
        notificationId,
        emailSent: false,
        emailSkippedReason: 'no_email',
      };
    }

    if (await isRecipientOnline(recipientId)) {
      logEvent('Email Skipped', {
        recipientId,
        notificationType: type,
        reason: 'recipient_online',
      });
      return {
        success: true,
        notificationId,
        emailSent: false,
        emailSkippedReason: 'recipient_online',
      };
    }

    if (await isEmailThrottled(recipientId, conversationId, type)) {
      logEvent('Email Skipped', {
        recipientId,
        notificationType: type,
        reason: 'throttled',
        conversationId,
      });
      return {
        success: true,
        notificationId,
        emailSent: false,
        emailSkippedReason: 'throttled',
      };
    }

    let emailTitle = title;
    let emailMessage = message;

    if (type === NotificationType.NEW_MESSAGE) {
      const bundled = await getBundledMessageContent(recipientId, conversationId, message);
      emailTitle = bundled.title === 'New message' ? title : bundled.title;
      emailMessage = bundled.message;
    }

    const templateData = buildEmailTemplateData(type, emailTitle, emailMessage, link, metadata);

    const react = renderTemplate(type, templateData);
    const subject = buildEmailSubject(type, emailTitle, getMetadataString(metadata, 'projectName'));
    const emailResult = await sendEmailViaResend({ to: recipientEmail, subject, react });

    if (emailResult.ok) {
      try {
        await recordEmailSent(recipientId, conversationId, type);
      } catch (error) {
        logEvent('Email Failed', {
          recipientId,
          notificationType: type,
          stage: 'email_log',
          error: error instanceof Error ? error.message : 'Unknown email log error',
        });
      }

      logEvent('Email Sent', {
        recipientId,
        notificationType: type,
      });
      return { success: true, notificationId, emailSent: true };
    }

    logEvent('Email Failed', {
      recipientId,
      notificationType: type,
      error: emailResult.error,
    });

    return {
      success: true,
      notificationId,
      emailSent: false,
      emailSkippedReason: emailResult.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email workflow error';
    logEvent('Email Failed', {
      recipientId,
      notificationType: type,
      stage: 'email_workflow',
      error: message,
    });

    return {
      success: true,
      notificationId,
      emailSent: false,
      emailSkippedReason: message,
    };
  }
}

export { NotificationType } from './types';
export type { SendNotificationParams, SendNotificationResult } from './types';
