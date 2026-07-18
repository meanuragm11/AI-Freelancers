import { supabaseAdmin } from '@/lib/founder/server';
import { ESCALATION } from './constants';
import type { EscalationLevel, ModerationCategory } from './types';
import { sendNotification } from '@/lib/notifications/notificationService';
import { NotificationType } from '@/lib/notifications/types';

type EscalationInput = {
  userId: string;
  category: ModerationCategory;
  reason: string;
  sourceEntityType: 'project' | 'proposal' | 'chat';
  sourceEntityId: string;
  moderationLogId: string;
  riskScore: number;
};

function determineLevel(offenceNumber: number): EscalationLevel {
  if (offenceNumber >= ESCALATION.banOffences) return 'permanent_ban';
  if (offenceNumber >= ESCALATION.suspensionOffences) return '7d_suspension';
  if (offenceNumber >= ESCALATION.restrictionOffences) return '24h_restriction';
  return 'warning';
}

/**
 * Progressive enforcement:
 * 1st offence → friendly warning
 * 2nd → 24-hour restriction
 * 3rd → 7-day suspension
 * 4th+ → permanent ban
 */
export async function applyEscalation(input: EscalationInput): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, is_admin, account_status')
    .eq('id', input.userId)
    .maybeSingle();

  if (!profile || profile.is_admin) return;

  const { count } = await supabaseAdmin
    .from('user_moderation_warnings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.userId);

  const offenceNumber = (count ?? 0) + 1;
  const level = determineLevel(offenceNumber);

  await supabaseAdmin.from('user_moderation_warnings').insert({
    user_id: input.userId,
    offence_number: offenceNumber,
    category: input.category,
    reason: input.reason,
    source_entity_type: input.sourceEntityType,
    source_entity_id: input.sourceEntityId,
    moderation_log_id: input.moderationLogId,
  });

  const warningMessage =
    offenceNumber === 1
      ? `We've noticed content that may violate our community guidelines (${input.category}). Please keep all communication and payments on Zelance.`
      : `This is offence #${offenceNumber}. Further violations may result in account restrictions. Reason: ${input.reason}`;

  void sendNotification({
    type: NotificationType.SYSTEM,
    recipientId: input.userId,
    title: offenceNumber === 1 ? 'Community Guidelines Reminder' : 'Account Warning',
    message: warningMessage,
    link: '/trust-safety',
    metadata: { offenceNumber, category: input.category },
  });

  if (level === 'warning') return;

  const now = new Date();
  let expiresAt: string | null = null;
  let suspensionType: '24h_restriction' | '7d_suspension' | 'permanent_ban';
  let profileUpdates: Record<string, unknown> = {};

  if (level === '24h_restriction') {
    suspensionType = '24h_restriction';
    expiresAt = new Date(now.getTime() + ESCALATION.restrictionHours * 3600_000).toISOString();
    profileUpdates = {
      account_status: 'suspended',
      suspension_type: 'soft',
      suspended_at: now.toISOString(),
      suspension_reason: `Automated 24h restriction (offence #${offenceNumber}): ${input.reason}`,
      suspension_expires_at: expiresAt,
    };
  } else if (level === '7d_suspension') {
    suspensionType = '7d_suspension';
    expiresAt = new Date(now.getTime() + ESCALATION.suspensionDays * 86400_000).toISOString();
    profileUpdates = {
      account_status: 'suspended',
      suspension_type: 'full',
      suspended_at: now.toISOString(),
      suspension_reason: `Automated 7-day suspension (offence #${offenceNumber}): ${input.reason}`,
      suspension_expires_at: expiresAt,
    };
  } else {
    suspensionType = 'permanent_ban';
    profileUpdates = {
      account_status: 'banned',
      suspension_type: null,
      suspended_at: now.toISOString(),
      suspension_reason: `Automated permanent ban (offence #${offenceNumber}): ${input.reason}`,
      suspension_expires_at: null,
    };
  }

  await supabaseAdmin.from('user_moderation_suspensions').insert({
    user_id: input.userId,
    offence_number: offenceNumber,
    suspension_type: suspensionType,
    reason: input.reason,
    starts_at: now.toISOString(),
    expires_at: expiresAt,
    source_entity_type: input.sourceEntityType,
    source_entity_id: input.sourceEntityId,
    moderation_log_id: input.moderationLogId,
  });

  await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', input.userId);

  if (level === 'permanent_ban') {
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(input.userId, {
      ban_duration: '876000h',
    });
    if (banError) console.error('[moderation] Failed to ban auth user:', banError);
  }
}
