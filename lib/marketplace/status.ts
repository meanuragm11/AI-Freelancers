export { ACTIVE_DISPUTE_STATUSES, isActiveDisputeStatus } from '@/lib/disputes/constants';

export const ACTIVE_COLLAB_STATUSES = [
  'funded',
  'in_progress',
  'submitted',
  'active',
  'pending_approval',
  'disputed',
] as const;
export const PENDING_COLLAB_STATUSES = ['pending', 'pending_funding', 'draft'] as const;
export const COMPLETED_COLLAB_STATUSES = ['completed', 'released'] as const;
export const CANCELLED_COLLAB_STATUSES = ['cancelled', 'canceled', 'rejected', 'expired'] as const;

export const LOCKED_MILESTONE_STATUSES = ['funded', 'in_progress', 'submitted'] as const;
export const COMPLETED_MILESTONE_STATUSES = ['approved', 'released', 'completed'] as const;
export const UPCOMING_MILESTONE_STATUSES = ['draft', 'funded', 'in_progress', 'submitted'] as const;

export type ProjectStatusLabel = 'Active' | 'Pending' | 'Completed' | 'Disputed' | 'Cancelled';

export function mapProjectStatus(status?: string | null): ProjectStatusLabel {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'disputed') return 'Disputed';
  if ((COMPLETED_COLLAB_STATUSES as readonly string[]).includes(normalized)) return 'Completed';
  if ((CANCELLED_COLLAB_STATUSES as readonly string[]).includes(normalized)) return 'Cancelled';
  if ((ACTIVE_COLLAB_STATUSES as readonly string[]).includes(normalized)) return 'Active';
  if ((PENDING_COLLAB_STATUSES as readonly string[]).includes(normalized)) return 'Pending';
  return 'Pending';
}

