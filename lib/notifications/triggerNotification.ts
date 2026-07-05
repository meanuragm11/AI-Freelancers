import type { SendNotificationParams } from '@/lib/notifications/types';

export async function triggerNotification(params: SendNotificationParams): Promise<void> {
  try {
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error('[NotificationEngine] Client trigger failed:', error);
  }
}
