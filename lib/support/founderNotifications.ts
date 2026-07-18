import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { supabaseAdmin } from '@/lib/founder/server';
import { founderTicketDetailPath } from '@/lib/support/founderConstants';

export { founderTicketDetailPath };

export async function notifyFounderAdmins(input: {
  title: string;
  message: string;
  link: string;
  idempotencyKey: string;
}) {
  const { data: admins, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('is_admin', true);

  if (error || !admins?.length) return;

  await Promise.all(
    admins.map((admin) =>
      sendNotification({
        type: NotificationType.SUPPORT_TICKET,
        recipientId: admin.id,
        title: input.title,
        message: input.message,
        link: input.link,
        metadata: {
          idempotencyKey: `${input.idempotencyKey}:admin:${admin.id}`,
        },
      }).catch((notifyError) =>
        console.error('Failed to notify founder admin:', notifyError)
      )
    )
  );
}
