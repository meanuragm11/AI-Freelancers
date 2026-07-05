export enum NotificationType {
  NEW_MESSAGE = 'message',
  CUSTOM_PROJECT_REQUEST = 'project_request',
  NEW_QUOTATION = 'quotation',
  QUOTATION_ACCEPTED = 'quotation_accepted',
  ESCROW_FUNDED = 'escrow_funded',
  MILESTONE_PROPOSED = 'milestone_proposed',
  MILESTONE_FUNDED = 'milestone_funded',
  MILESTONE_SUBMITTED = 'milestone_submitted',
  MILESTONE_APPROVED = 'milestone_approved',
  PROJECT_COMPLETED = 'project_completed',
  REVIEW_RECEIVED = 'review_received',
  DISPUTE_EVENT = 'dispute_event',
  REFUND_EVENT = 'refund_event',
  SERVICE_PURCHASED = 'service_purchased',
  AI_ASSET_PURCHASED = 'asset_purchased',
  SUPPORT_TICKET = 'support_ticket',
}

export interface NotificationMetadata {
  collabId?: string;
  conversationId?: string;
  milestoneId?: string;
  projectName?: string;
  projectStatus?: string;
  senderName?: string;
  amount?: string | number;
  rating?: number;
  serviceName?: string;
  assetName?: string;
  actorId?: string;
  dashboardPath?: string;
  idempotencyKey?: string;
  ticketNumber?: string;
  category?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface SendNotificationParams {
  type: NotificationType;
  recipientId: string;
  recipientEmail?: string;
  title: string;
  message: string;
  link?: string;
  metadata?: NotificationMetadata;
  skipDbInsert?: boolean;
}

export interface SendNotificationResult {
  success: boolean;
  notificationId?: string;
  emailSent: boolean;
  emailSkippedReason?: string;
  error?: string;
}

export interface EmailTemplateData {
  type: NotificationType;
  heading: string;
  projectName?: string;
  projectStatus?: string;
  dateTime: string;
  content: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}
