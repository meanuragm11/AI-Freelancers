import { formatDisplayName } from '@/lib/display/formatDisplayName';

export interface ClientNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const NEW_MESSAGE_FROM_TITLE = /^New message from (.+)$/i;

/** Masks sender surnames in notification titles shown to recipients. */
export function formatNotificationTitle(title: string): string {
  const match = title.match(NEW_MESSAGE_FROM_TITLE);
  if (match?.[1]) {
    return `New message from ${formatDisplayName(match[1])}`;
  }
  return title;
}

export function formatNotificationForDisplay(
  notification: ClientNotification,
): ClientNotification {
  return {
    ...notification,
    title: formatNotificationTitle(notification.title),
  };
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getNotificationIconType(type: string): 'message' | 'project' | 'payment' | 'alert' | 'default' {
  switch (type) {
    case 'message':
      return 'message';
    case 'project_request':
    case 'quotation':
    case 'quotation_accepted':
    case 'open_project_proposal':
    case 'open_project_hired':
    case 'open_project_proposal_rejected':
    case 'project_completed':
      return 'project';
    case 'escrow_funded':
    case 'milestone_proposed':
    case 'milestone_funded':
    case 'milestone_submitted':
    case 'milestone_approved':
    case 'service_purchased':
    case 'asset_purchased':
      return 'payment';
    case 'dispute_event':
    case 'refund_event':
    case 'support_ticket':
      return 'alert';
    default:
      return 'default';
  }
}

export function getNotificationActionLabel(type: string): string {
  switch (type) {
    case 'message':
      return 'Open conversation';
    case 'project_request':
      return 'Review request';
    case 'quotation':
      return 'View quotation';
    case 'quotation_accepted':
      return 'Open project';
    case 'escrow_funded':
    case 'milestone_funded':
      return 'View escrow';
    case 'milestone_proposed':
    case 'milestone_submitted':
    case 'milestone_approved':
      return 'View milestone';
    case 'project_completed':
      return 'View project';
    case 'review_received':
      return 'View review';
    case 'dispute_event':
      return 'Open Dispute Center';
    case 'refund_event':
      return 'View refund request';
    case 'service_purchased':
      return 'View Services';
    case 'asset_purchased':
      return 'View asset';
    case 'support_ticket':
      return 'View ticket';
    case 'open_project_proposal':
    case 'open_project_proposal_rejected':
      return 'View proposals';
    case 'open_project_hired':
      return 'Open workspace';
    default:
      return 'View details';
  }
}
