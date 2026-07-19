import { formatDisplayName } from '@/lib/display/formatDisplayName';
import { EMAIL_PATHS } from '@/lib/urls/appUrl';
import {
  NotificationType,
  type EmailSummaryFields,
  type NotificationMetadata,
} from './types';
import type { EmailSummaryRow } from './types';

const UUID_REGEX =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

function containsUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

const INTERNAL_TOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^\[\[FILE_PATH\|[^\]]+\]\]\s*/i, 'Sent an attachment'],
  [/^\[\[FILE\|[^\]]*\]\]\s*/i, 'Sent an attachment'],
  [/^\[\[MILESTONE_CARD\|[^\]]*\]\]\s*/i, 'Milestone update'],
  [/^\[\[MILESTONE\|[^\]]*\]\]\s*/i, 'Sent a milestone proposal'],
  [/^\[\[QUOTATION\|[^\]]*\]\]\s*/i, 'Sent a quotation'],
  [/^\[\[PROPOSAL_CARD\|[^\]]*\]\]\s*/i, 'Sent a project proposal'],
  [/^\[\[PROPOSAL_ACCEPTED(?:\|[^\]]*)?\]\]\s*/i, 'Accepted a project proposal'],
  [/^\[\[PROPOSAL_FUNDED(?:\|[^\]]*)?\]\]\s*/i, 'Funded a project proposal'],
  [/^\[\[ESCROW_FUNDED\]\]\s*/i, 'Escrow has been funded'],
  [/^\[\[NEW_MILESTONE_PROPOSED\]\]\s*/i, 'A new milestone was proposed'],
  [/^\[\[COUNTER_OFFER\|[^\]]*\]\]\s*/i, 'Sent a revised price proposal'],
  [/^\[\[PROPOSAL_ACCEPTED\]\]\s*/i, 'Accepted a project proposal'],
  [/^\[\[[\s\S]+?\]\]\s*/, ''],
];

function getMetadataString(metadata: NotificationMetadata | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function formatUsdAmount(amount: string | number | undefined): string | undefined {
  if (amount == null || amount === '') return undefined;
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isFinite(numeric)) {
    return `$${numeric.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
  return undefined;
}

export function formatTransactionReference(id: string | undefined): string | undefined {
  if (!id?.trim()) return undefined;
  const trimmed = id.trim();
  if (containsUuid(trimmed)) {
    return trimmed.replace(/-/g, '').slice(-8).toUpperCase();
  }
  if (trimmed.length > 12) {
    return trimmed.slice(-8).toUpperCase();
  }
  return trimmed;
}

/** Strip internal chat tokens, UUIDs, markdown, and debug fragments from email-visible text. */
export function sanitizeEmailText(text: string): string {
  let cleaned = text.trim();
  if (!cleaned) return '';

  for (const [pattern, replacement] of INTERNAL_TOKEN_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned
    .replace(/\[\[[^\]]+\]\]/g, '')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\{[\s\S]*?\}/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

export function buildEmailHeading(
  type: NotificationType,
  title: string,
  metadata?: NotificationMetadata
): string {
  const projectName = getMetadataString(metadata, 'projectName');
  const senderName = getMetadataString(metadata, 'senderName');

  switch (type) {
    case NotificationType.NEW_MESSAGE:
      if (/^\d+ new messages$/i.test(title)) return title;
      return senderName ? `New Message from ${formatDisplayName(senderName)}` : 'New Message';
    case NotificationType.CUSTOM_PROJECT_REQUEST:
      return 'New Project Request';
    case NotificationType.NEW_QUOTATION:
      return 'New Quotation Received';
    case NotificationType.QUOTATION_ACCEPTED:
      return 'Quotation Accepted';
    case NotificationType.ESCROW_FUNDED:
      return 'Escrow Successfully Funded';
    case NotificationType.MILESTONE_FUNDED:
      return 'Milestone Successfully Funded';
    case NotificationType.MILESTONE_PROPOSED:
      return 'New Milestone Proposed';
    case NotificationType.MILESTONE_SUBMITTED:
      if (/revision requested/i.test(title)) return 'Revision Requested';
      if (/extra revision/i.test(title)) return 'Extra Revision Purchased';
      return 'Deliverable Ready for Review';
    case NotificationType.MILESTONE_APPROVED:
      return 'Milestone Approved';
    case NotificationType.PROJECT_COMPLETED:
      if (/hired/i.test(title)) return 'You Were Hired';
      return 'Project Completed';
    case NotificationType.REVIEW_RECEIVED:
      return 'New Review Received';
    case NotificationType.DISPUTE_EVENT:
      return sanitizeEmailText(title) || 'Dispute Update';
    case NotificationType.REFUND_EVENT:
      return sanitizeEmailText(title) || 'Refund Update';
    case NotificationType.SERVICE_PURCHASED:
      return 'Service Purchase Confirmed';
    case NotificationType.AI_ASSET_PURCHASED:
      return 'Purchase Confirmed';
    case NotificationType.SUPPORT_TICKET:
      return sanitizeEmailText(title) || 'Support Ticket Update';
    case NotificationType.OPEN_PROJECT_PROPOSAL:
      return 'New Proposal Received';
    case NotificationType.OPEN_PROJECT_HIRED:
      return 'You Were Hired';
    case NotificationType.OPEN_PROJECT_PROPOSAL_REJECTED:
      return 'Proposal Not Selected';
    case NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_1:
      return 'Review Your Proposals';
    case NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_2:
      return 'Final Reminder';
    case NotificationType.OPEN_PROJECT_AUTO_ARCHIVED:
      return 'Project Archived';
    case NotificationType.SYSTEM:
      return sanitizeEmailText(title) || 'Account Update';
    default:
      return sanitizeEmailText(title) || (projectName ? `Update on ${projectName}` : 'Notification');
  }
}

export function buildEmailDescription(
  type: NotificationType,
  message: string,
  metadata?: NotificationMetadata
): string {
  const sanitized = sanitizeEmailText(message);
  const projectName = getMetadataString(metadata, 'projectName');
  const senderName = getMetadataString(metadata, 'senderName');
  const milestoneName = getMetadataString(metadata, 'milestoneName') ?? getMetadataString(metadata, 'currentMilestone');
  const amount = formatUsdAmount(metadata?.amount as string | number | undefined);
  const serviceName = getMetadataString(metadata, 'serviceName') ?? getMetadataString(metadata, 'assetName');
  const ticketNumber = getMetadataString(metadata, 'ticketNumber');
  const rating = metadata?.rating;

  if (sanitized.length >= 20) {
    return sanitized;
  }

  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return senderName
        ? `${formatDisplayName(senderName)} sent you a message${projectName ? ` about ${projectName}` : ''}. Open the conversation to reply.`
        : 'You have a new message waiting in your inbox.';
    case NotificationType.CUSTOM_PROJECT_REQUEST:
      return projectName
        ? `A client submitted a custom project request for "${projectName}". Review the details and respond when ready.`
        : 'A client submitted a new custom project request. Review the details and respond when ready.';
    case NotificationType.NEW_QUOTATION:
      return projectName
        ? `You received a new quotation for "${projectName}". Review pricing, timeline, and scope before accepting.`
        : 'You received a new quotation. Review pricing, timeline, and scope before accepting.';
    case NotificationType.QUOTATION_ACCEPTED:
      return projectName
        ? `Your quotation for "${projectName}" was accepted. The project is ready for escrow funding.`
        : 'Your quotation was accepted. The project is ready for escrow funding.';
    case NotificationType.ESCROW_FUNDED:
      return projectName
        ? `Escrow${amount ? ` of ${amount}` : ''} for "${projectName}" is funded. You can begin work on the first milestone.`
        : `Escrow${amount ? ` of ${amount}` : ''} has been funded. You can begin work on the first milestone.`;
    case NotificationType.MILESTONE_FUNDED:
      return milestoneName
        ? `"${milestoneName}"${amount ? ` (${amount})` : ''} has been funded. You can begin work on this milestone.`
        : `A milestone${amount ? ` of ${amount}` : ''} has been funded. You can begin work on the deliverables.`;
    case NotificationType.MILESTONE_PROPOSED:
      return milestoneName
        ? `A new milestone "${milestoneName}" was added to ${projectName ? `"${projectName}"` : 'your project'}. Review and accept or discuss changes.`
        : `A new milestone was proposed${projectName ? ` for "${projectName}"` : ''}. Review and respond when ready.`;
    case NotificationType.MILESTONE_SUBMITTED:
      return milestoneName
        ? `"${milestoneName}" was submitted for your review${projectName ? ` on "${projectName}"` : ''}. Accept or request changes.`
        : sanitized || 'A deliverable was submitted for your review. Accept or request changes.';
    case NotificationType.MILESTONE_APPROVED:
      return milestoneName
        ? `"${milestoneName}" was approved${amount ? ` and ${amount} released` : ''}${projectName ? ` for "${projectName}"` : ''}.`
        : sanitized || 'Your milestone was approved and payment has been released.';
    case NotificationType.PROJECT_COMPLETED:
      return projectName
        ? `"${projectName}" has been marked complete. Thank you for delivering great work on Zelance.`
        : sanitized || 'Your project has been marked complete.';
    case NotificationType.REVIEW_RECEIVED:
      return rating
        ? `You received a ${rating}-star review${projectName ? ` for "${projectName}"` : ''}.`
        : sanitized || 'You received a new review on your profile.';
    case NotificationType.DISPUTE_EVENT:
      return sanitized || (projectName ? `There is an update on the dispute for "${projectName}".` : 'There is an update on your dispute.');
    case NotificationType.REFUND_EVENT:
      return sanitized || (projectName ? `There is an update on the refund request for "${projectName}".` : 'There is an update on your refund request.');
    case NotificationType.SERVICE_PURCHASED:
      return serviceName
        ? `A buyer purchased "${serviceName}". Check your dashboard for order details.`
        : sanitized || 'A buyer purchased one of your services.';
    case NotificationType.AI_ASSET_PURCHASED:
      return serviceName
        ? `"${serviceName}" is now in your library and ready to use.`
        : sanitized || 'Your purchase is confirmed and ready in your library.';
    case NotificationType.SUPPORT_TICKET:
      return ticketNumber
        ? sanitized || `Your support ticket ${ticketNumber} has been updated.`
        : sanitized || 'Your support ticket has been updated.';
    case NotificationType.OPEN_PROJECT_PROPOSAL:
      return projectName
        ? `A builder submitted a proposal for "${projectName}". Review candidates and move forward when ready.`
        : sanitized || 'A builder submitted a new proposal for your open project.';
    case NotificationType.OPEN_PROJECT_HIRED:
      return projectName
        ? `Congratulations — you were hired for "${projectName}". Open your workspace to get started.`
        : sanitized || 'Congratulations — you were hired. Open your workspace to get started.';
    case NotificationType.OPEN_PROJECT_PROPOSAL_REJECTED:
      return projectName
        ? `Your proposal for "${projectName}" was not selected this time. Keep exploring new opportunities on Zelance.`
        : sanitized || 'Your proposal was not selected this time.';
    case NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_1:
      return projectName
        ? `"${projectName}" has proposals waiting for review. Shortlist, message, or hire to keep momentum.`
        : sanitized;
    case NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_2:
      return projectName
        ? `"${projectName}" will be archived soon unless you engage with proposals. Take action within 24 hours.`
        : sanitized;
    case NotificationType.OPEN_PROJECT_AUTO_ARCHIVED:
      return projectName
        ? `"${projectName}" was archived due to inactivity. You can restore it within 90 days from My Open Projects.`
        : sanitized;
    case NotificationType.SYSTEM:
      return sanitized || 'There is an update on your Zelance account.';
    default:
      return sanitized || 'You have a new update on Zelance.';
  }
}

export function buildEmailSummaryFields(
  type: NotificationType,
  metadata: NotificationMetadata | undefined,
  dateTime: string
): EmailSummaryFields | undefined {
  const projectName = getMetadataString(metadata, 'projectName');
  const clientName =
    getMetadataString(metadata, 'clientName') ?? getMetadataString(metadata, 'senderName');
  const builderName = getMetadataString(metadata, 'builderName');
  const milestoneName =
    getMetadataString(metadata, 'milestoneName') ?? getMetadataString(metadata, 'currentMilestone');
  const amount = formatUsdAmount(metadata?.amount as string | number | undefined);
  const serviceName = getMetadataString(metadata, 'serviceName') ?? getMetadataString(metadata, 'assetName');
  const ticketNumber = getMetadataString(metadata, 'ticketNumber');
  const transactionId = formatTransactionReference(getMetadataString(metadata, 'transactionId'));
  const paymentDate = getMetadataString(metadata, 'paymentDate') ?? dateTime;
  const rating = metadata?.rating != null ? `${metadata.rating} stars` : undefined;

  const statusLabel =
    getMetadataString(metadata, 'projectStatus') ??
    getStatusLabelForType(type, metadata);

  const fields: EmailSummaryFields = {};

  if (projectName) fields.projectName = projectName;
  if (clientName) fields.clientName = formatDisplayName(clientName);
  if (builderName) fields.builderName = formatDisplayName(builderName);
  if (getMetadataString(metadata, 'senderName') && type === NotificationType.NEW_MESSAGE) {
    fields.senderName = formatDisplayName(getMetadataString(metadata, 'senderName')!);
  }
  if (amount) {
    if (
      type === NotificationType.ESCROW_FUNDED ||
      type === NotificationType.MILESTONE_FUNDED
    ) {
      fields.escrowAmount = amount;
    } else {
      fields.paymentAmount = amount;
    }
  }
  if (milestoneName) fields.currentMilestone = milestoneName;
  if (statusLabel) fields.statusLabel = statusLabel;
  if (paymentDate) fields.paymentDate = paymentDate;
  if (transactionId) fields.transactionReference = transactionId;
  if (rating) fields.rating = rating;
  if (serviceName) fields.serviceName = serviceName;
  if (ticketNumber) fields.ticketNumber = ticketNumber;
  if (getMetadataString(metadata, 'category')) fields.category = getMetadataString(metadata, 'category');

  const hasContent = Object.values(fields).some(Boolean);
  return hasContent ? fields : undefined;
}

function getStatusLabelForType(type: NotificationType, metadata?: NotificationMetadata): string | undefined {
  switch (type) {
    case NotificationType.ESCROW_FUNDED:
    case NotificationType.MILESTONE_FUNDED:
      return 'Funded';
    case NotificationType.MILESTONE_PROPOSED:
      return 'Proposed';
    case NotificationType.MILESTONE_SUBMITTED:
      return 'Awaiting review';
    case NotificationType.MILESTONE_APPROVED:
      return 'Approved';
    case NotificationType.PROJECT_COMPLETED:
      return 'Completed';
    case NotificationType.QUOTATION_ACCEPTED:
      return 'Accepted';
    case NotificationType.NEW_QUOTATION:
      return 'Pending review';
    case NotificationType.CUSTOM_PROJECT_REQUEST:
      return 'Pending review';
    case NotificationType.DISPUTE_EVENT:
      return 'Disputed';
    case NotificationType.REFUND_EVENT:
      return 'Refund in progress';
    case NotificationType.SERVICE_PURCHASED:
    case NotificationType.AI_ASSET_PURCHASED:
      return 'Confirmed';
    case NotificationType.OPEN_PROJECT_HIRED:
      return 'Hired';
    case NotificationType.OPEN_PROJECT_PROPOSAL_REJECTED:
      return 'Not selected';
    case NotificationType.OPEN_PROJECT_AUTO_ARCHIVED:
      return 'Archived';
    default:
      return getMetadataString(metadata, 'priority') ?? undefined;
  }
}

export function summaryFieldsToRows(fields: EmailSummaryFields | undefined): EmailSummaryRow[] {
  if (!fields) return [];

  const rows: EmailSummaryRow[] = [];
  const push = (label: string, value: string | undefined, badge?: EmailSummaryRow['badge']) => {
    if (value?.trim()) rows.push({ label, value, badge });
  };

  push('Project', fields.projectName);
  push('From', fields.senderName);
  push('Client', fields.clientName);
  push('Builder', fields.builderName);
  push('Service', fields.serviceName);
  push('Escrow Amount', fields.escrowAmount);
  push('Payment Amount', fields.paymentAmount);
  push('Milestone', fields.currentMilestone);
  push('Rating', fields.rating);
  push('Ticket', fields.ticketNumber);
  push('Category', fields.category);
  if (fields.statusLabel) {
    const warningStatuses = new Set(['Disputed', 'Refund in progress', 'Archived', 'Not selected']);
    const successStatuses = new Set([
      'Funded',
      'Approved',
      'Completed',
      'Confirmed',
      'Hired',
      'Accepted',
    ]);
    const badge = warningStatuses.has(fields.statusLabel)
      ? 'warning'
      : successStatuses.has(fields.statusLabel)
        ? 'success'
        : undefined;
    push('Status', fields.statusLabel, badge);
  }
  push('Date', fields.paymentDate);
  push('Reference', fields.transactionReference);

  return rows;
}

export function buildEmailInfoItems(type: NotificationType): string[] | undefined {
  switch (type) {
    case NotificationType.ESCROW_FUNDED:
    case NotificationType.MILESTONE_FUNDED:
      return [
        'Funds are securely held in escrow until milestone approval.',
        'Payment is released automatically after you deliver and the client approves.',
        'Keep all project communication on Zelance for your protection.',
      ];
    case NotificationType.DISPUTE_EVENT:
      return [
        'Respond promptly with any evidence or context that supports your case.',
        'Our team reviews all disputes fairly and will keep you updated.',
      ];
    case NotificationType.REFUND_EVENT:
      return [
        'Refund decisions are reviewed by our team to ensure fairness for both parties.',
        'You will receive another notification when the status changes.',
      ];
    case NotificationType.MILESTONE_SUBMITTED:
      return [
        'Review the deliverable carefully before approving or requesting changes.',
        'Approved milestones release payment from escrow automatically.',
      ];
    case NotificationType.SUPPORT_TICKET:
      return [
        'Our support team typically responds within one business day.',
        'Reply from your ticket page to add more context at any time.',
      ];
    default:
      return undefined;
  }
}

export function getEmailPrimaryCtaLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return 'Open Conversation';
    case NotificationType.CUSTOM_PROJECT_REQUEST:
      return 'Review Request';
    case NotificationType.NEW_QUOTATION:
      return 'View Quotation';
    case NotificationType.QUOTATION_ACCEPTED:
      return 'View Project';
    case NotificationType.ESCROW_FUNDED:
    case NotificationType.MILESTONE_FUNDED:
      return 'View Escrow';
    case NotificationType.MILESTONE_PROPOSED:
    case NotificationType.MILESTONE_SUBMITTED:
    case NotificationType.MILESTONE_APPROVED:
      return 'View Milestone';
    case NotificationType.PROJECT_COMPLETED:
      return 'View Project';
    case NotificationType.REVIEW_RECEIVED:
      return 'View Review';
    case NotificationType.DISPUTE_EVENT:
      return 'Open Dispute Center';
    case NotificationType.REFUND_EVENT:
      return 'View Refund Request';
    case NotificationType.SERVICE_PURCHASED:
      return 'View Services';
    case NotificationType.AI_ASSET_PURCHASED:
      return 'View Library';
    case NotificationType.SUPPORT_TICKET:
      return 'View Ticket';
    case NotificationType.OPEN_PROJECT_PROPOSAL:
      return 'View Proposals';
    case NotificationType.OPEN_PROJECT_HIRED:
      return 'Open Workspace';
    case NotificationType.OPEN_PROJECT_PROPOSAL_REJECTED:
      return 'Browse Projects';
    case NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_1:
    case NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_2:
    case NotificationType.OPEN_PROJECT_AUTO_ARCHIVED:
      return 'Manage Project';
    case NotificationType.SYSTEM:
      return 'Open Dashboard';
    default:
      return 'View Details';
  }
}

export function getEmailSecondaryCtaLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return 'View All Messages';
    default:
      return 'Open Dashboard';
  }
}

export function getEmailPrimaryHref(
  type: NotificationType,
  link: string | undefined
): string | undefined {
  switch (type) {
    case NotificationType.ESCROW_FUNDED:
    case NotificationType.MILESTONE_FUNDED:
      return EMAIL_PATHS.escrowLedger;
    default:
      return link;
  }
}

export function getEmailSecondaryHref(metadata?: NotificationMetadata): string {
  return getMetadataString(metadata, 'dashboardPath') ?? EMAIL_PATHS.workspace;
}

export function buildEmailSubject(
  type: NotificationType,
  title: string,
  projectName?: string
): string {
  const prefix = projectName ? `${projectName} — ` : '';

  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return `${prefix}${buildEmailHeading(type, title, { projectName })}`;
    case NotificationType.CUSTOM_PROJECT_REQUEST:
      return `${prefix}New project request`;
    case NotificationType.NEW_QUOTATION:
      return `${prefix}New quotation received`;
    case NotificationType.QUOTATION_ACCEPTED:
      return `${prefix}Quotation accepted`;
    case NotificationType.ESCROW_FUNDED:
      return `${prefix}Escrow funded`;
    case NotificationType.MILESTONE_PROPOSED:
      return `${prefix}New milestone proposed`;
    case NotificationType.MILESTONE_FUNDED:
      return `${prefix}Milestone funded`;
    case NotificationType.MILESTONE_SUBMITTED:
      return `${prefix}Deliverable submitted`;
    case NotificationType.MILESTONE_APPROVED:
      return `${prefix}Milestone approved`;
    case NotificationType.PROJECT_COMPLETED:
      return `${prefix}Project completed`;
    case NotificationType.REVIEW_RECEIVED:
      return `${prefix}New review received`;
    case NotificationType.DISPUTE_EVENT:
      return `${prefix}${sanitizeEmailText(title) || 'Dispute update'}`;
    case NotificationType.REFUND_EVENT:
      return `${prefix}${sanitizeEmailText(title) || 'Refund update'}`;
    case NotificationType.SERVICE_PURCHASED:
      return `${prefix}Service purchased`;
    case NotificationType.AI_ASSET_PURCHASED:
      return `${prefix}Purchase confirmed`;
    case NotificationType.SUPPORT_TICKET:
      return sanitizeEmailText(title).startsWith('[')
        ? sanitizeEmailText(title).replace(/^\[|\]$/g, '')
        : `Zelance Support — ${sanitizeEmailText(title)}`;
    case NotificationType.OPEN_PROJECT_PROPOSAL:
      return `${prefix}New proposal received`;
    case NotificationType.OPEN_PROJECT_HIRED:
      return `${prefix}You were hired`;
    case NotificationType.OPEN_PROJECT_PROPOSAL_REJECTED:
      return `${prefix}Proposal update`;
    case NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_1:
      return `${prefix}Review your proposals`;
    case NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_2:
      return `${prefix}Final reminder — engage with proposals`;
    case NotificationType.OPEN_PROJECT_AUTO_ARCHIVED:
      return `${prefix}Project archived`;
    case NotificationType.SYSTEM:
      return sanitizeEmailText(title) || 'Account update';
    default:
      return sanitizeEmailText(title) || 'Zelance notification';
  }
}
