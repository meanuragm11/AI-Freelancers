import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { notifyFounderAdmins } from '@/lib/support/founderNotifications';
import { founderDisputeDetailPath } from '@/lib/disputes/constants';

export async function notifyFoundersOfDisputeEvent(input: {
  disputeId: string;
  title: string;
  message: string;
  idempotencyKey: string;
}) {
  await notifyFounderAdmins({
    title: input.title,
    message: input.message,
    link: founderDisputeDetailPath(input.disputeId),
    idempotencyKey: input.idempotencyKey,
  });
}

export async function notifyDisputeParticipants(input: {
  buyerId: string;
  builderId: string;
  collabId: string;
  projectTitle: string;
  title: string;
  message: string;
  eventKey: string;
  actorId?: string;
}) {
  const link = `/collab/${input.collabId}`;
  const recipients = [input.buyerId, input.builderId];

  await Promise.all(
    recipients.map((recipientId) =>
      sendNotification({
        type: NotificationType.DISPUTE_EVENT,
        recipientId,
        title: input.title,
        message: input.message,
        link,
        metadata: {
          collabId: input.collabId,
          projectName: input.projectTitle,
          projectStatus: 'Disputed',
          actorId: input.actorId,
          idempotencyKey: `dispute:${input.collabId}:${input.eventKey}:${recipientId}`,
        },
      }).catch((error) => console.error('Failed to notify dispute participant:', error))
    )
  );
}
