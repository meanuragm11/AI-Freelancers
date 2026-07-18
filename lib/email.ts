import { formatDisplayName } from '@/lib/display/formatDisplayName';
import { sendEmailViaResend } from '@/lib/notifications/resend';

/** @deprecated Use sendNotification from @/lib/notifications/notificationService */
export const sendNotificationEmail = async (to: string, subject: string, html: string) => {
  await sendEmailViaResend({ to, subject, html });
};

/** @deprecated Use sendNotification with NotificationType.NEW_MESSAGE */
export const sendMessageNotificationEmail = async ({
  to,
  senderName,
  preview,
  inboxLink,
  collabTitle,
}: {
  to: string;
  senderName: string;
  preview: string;
  inboxLink: string;
  collabTitle: string;
}) => {
  const maskedSenderName = formatDisplayName(senderName);
  const { sendNotification, NotificationType } = await import('@/lib/notifications/notificationService');
  await sendNotification({
    type: NotificationType.NEW_MESSAGE,
    recipientId: '',
    recipientEmail: to,
    title: `New message from ${maskedSenderName}`,
    message: preview,
    link: inboxLink,
    metadata: { projectName: collabTitle, senderName: maskedSenderName },
    skipDbInsert: true,
  });
};
