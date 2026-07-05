export const SUPPORT_CATEGORIES = [
  'Payment',
  'Withdrawal',
  'Escrow',
  'Service Purchase',
  'AI Asset',
  'Custom Project',
  'Messaging',
  'Disputes',
  'Account & Login',
  'Profile Verification',
  'Bug Report',
  'Feature Request',
  'Technical Error',
  'Refund Request',
  'Security Concern',
  'Other',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_PRIORITIES = ['low', 'medium', 'high'] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_STATUSES = [
  'open',
  'in_progress',
  'waiting_for_user',
  'arbitration_requested',
  'resolved',
  'closed',
] as const;

export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_ACTIVE_STATUSES = [
  'open',
  'in_progress',
  'waiting_for_user',
  'arbitration_requested',
] as const;
export const SUPPORT_RESOLVED_STATUSES = ['resolved', 'closed'] as const;

export const SUPPORT_ARBITRATION_RELATED_CATEGORIES = ['Disputes', 'Refund Request', 'Escrow'] as const;

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_user: 'Waiting for User',
  arbitration_requested: 'Arbitration Requested',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const SUPPORT_BUCKET = 'support-attachments';

export const SUPPORT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_MAX_FILES = 5;

export const SUPPORT_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
