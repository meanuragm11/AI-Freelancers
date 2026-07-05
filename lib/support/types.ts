import type { SupportCategory, SupportPriority, SupportStatus } from './constants';

export type SupportAttachment = {
  name: string;
  url: string;
  type: string;
  size?: number;
  bucket: string;
  path: string;
};

export type SupportContextIds = {
  transactionId?: string;
  escrowId?: string;
  projectId?: string;
  serviceId?: string;
  aiAssetId?: string;
};

export type SupportTicket = {
  id: string;
  ticket_number: string;
  user_id: string;
  name: string;
  email: string;
  category: SupportCategory | string;
  subject: string;
  message: string;
  status: SupportStatus;
  priority: SupportPriority;
  transaction_id: string | null;
  escrow_id: string | null;
  project_id: string | null;
  service_id: string | null;
  ai_asset_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportTicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_role: 'user' | 'staff' | 'system';
  body: string;
  attachments: SupportAttachment[];
  is_internal: boolean;
  created_at: string;
};

export type CreateSupportTicketInput = {
  category: string;
  subject: string;
  description: string;
  priority: SupportPriority;
  email: string;
  name: string;
  attachments?: SupportAttachment[];
} & SupportContextIds;
