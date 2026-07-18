import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/server/supabase';
import { sendNotification } from '@/lib/notifications/notificationService';
import { NotificationType } from '@/lib/notifications/types';
import {
  ACTIVITY_AUTO_ARCHIVE_HOURS,
  ACTIVITY_REMINDER_1_HOURS,
  ACTIVITY_REMINDER_2_HOURS,
  ARCHIVE_REASON_INACTIVITY,
  ARCHIVE_RESTORE_WINDOW_DAYS,
  MEANINGFUL_MESSAGES_REQUIRED,
  type HiringActivityType,
} from './buyerPublishingConstants';
import { logMarketplaceAudit } from './limits';
import { evaluateInactiveBuyerStatus } from './buyerRestrictions';
import { isMeaningfulMessage } from './buyerTrustSignals';

type ProjectRow = {
  id: string;
  buyer_id: string;
  title: string;
  status: string;
  activity_count: number;
  monitoring_started_at: string | null;
  activity_reminder_1_sent_at: string | null;
  activity_reminder_2_sent_at: string | null;
  archived_at: string | null;
  long_term_archived_at: string | null;
};

const IMMEDIATE_QUALIFYING_ACTIONS: HiringActivityType[] = [
  'shortlist_proposal',
  'invite_freelancer',
  'start_negotiation',
  'hire',
];

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

async function countMeaningfulMessages(
  admin: SupabaseClient,
  projectId: string
): Promise<number> {
  const { count } = await admin
    .from('project_hiring_activities')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('action_type', 'message_proposer')
    .eq('qualifies_activity', true);

  return count ?? 0;
}

async function hasImmediateQualifyingAction(
  admin: SupabaseClient,
  projectId: string
): Promise<boolean> {
  const { count } = await admin
    .from('project_hiring_activities')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .in('action_type', IMMEDIATE_QUALIFYING_ACTIONS)
    .eq('qualifies_activity', true);

  return (count ?? 0) > 0;
}

export async function syncProjectActivityQualification(
  admin: SupabaseClient,
  projectId: string
): Promise<{ qualified: boolean; activityCount: number }> {
  const { data: project } = await admin
    .from('projects')
    .select('id, activity_count')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return { qualified: false, activityCount: 0 };

  const [meaningfulMessages, hasImmediateAction] = await Promise.all([
    countMeaningfulMessages(admin, projectId),
    hasImmediateQualifyingAction(admin, projectId),
  ]);

  const qualified =
    hasImmediateAction || meaningfulMessages >= MEANINGFUL_MESSAGES_REQUIRED;
  const nextCount = qualified ? Math.max(project.activity_count ?? 0, 1) : 0;

  if ((project.activity_count ?? 0) !== nextCount) {
    await admin.from('projects').update({ activity_count: nextCount }).eq('id', projectId);
  }

  return { qualified, activityCount: nextCount };
}

export async function recordMeaningfulMessageActivity(
  supabase: SupabaseClient,
  params: {
    projectId: string;
    buyerId: string;
    proposalId: string;
    messagePreview: string;
  }
): Promise<void> {
  if (!isMeaningfulMessage(params.messagePreview)) return;

  const admin = createSupabaseAdminClient();
  const { data: project } = await admin
    .from('projects')
    .select('id, buyer_id, status')
    .eq('id', params.projectId)
    .eq('buyer_id', params.buyerId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!project || !['published', 'receiving_proposals', 'negotiating'].includes(project.status)) {
    return;
  }

  const { error } = await admin.from('project_hiring_activities').insert({
    project_id: params.projectId,
    buyer_id: params.buyerId,
    action_type: 'message_proposer',
    target_id: params.proposalId,
    actor_id: params.buyerId,
    qualifies_activity: true,
    metadata: { preview: params.messagePreview.slice(0, 120), meaningful: true },
  });

  if (error && error.code !== '23505') throw error;

  await syncProjectActivityQualification(admin, params.projectId);
}

export async function recordHiringActivity(
  supabase: SupabaseClient,
  params: {
    projectId: string;
    buyerId: string;
    actionType: HiringActivityType;
    actorId?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ recorded: boolean; activityCount: number }> {
  const admin = createSupabaseAdminClient();

  const { data: project } = await admin
    .from('projects')
    .select('id, buyer_id, status, activity_count, monitoring_started_at')
    .eq('id', params.projectId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!project || project.buyer_id !== params.buyerId) {
    return { recorded: false, activityCount: 0 };
  }

  if (!['published', 'receiving_proposals', 'negotiating'].includes(project.status)) {
    return { recorded: false, activityCount: project.activity_count ?? 0 };
  }

  if (params.actionType === 'message_proposer') {
    return { recorded: false, activityCount: project.activity_count ?? 0 };
  }

  const qualifies = IMMEDIATE_QUALIFYING_ACTIONS.includes(params.actionType);

  const { error: insertError } = await admin.from('project_hiring_activities').insert({
    project_id: params.projectId,
    buyer_id: params.buyerId,
    action_type: params.actionType,
    target_id: params.targetId ?? null,
    actor_id: params.actorId ?? params.buyerId,
    qualifies_activity: qualifies,
    metadata: params.metadata ?? {},
  });

  if (insertError) {
    if (insertError.code === '23505') {
      const synced = await syncProjectActivityQualification(admin, params.projectId);
      return { recorded: false, activityCount: synced.activityCount };
    }
    throw insertError;
  }

  const synced = await syncProjectActivityQualification(admin, params.projectId);

  await logMarketplaceAudit(supabase, {
    entity_type: 'project',
    entity_id: params.projectId,
    action: 'hiring_activity',
    actor_id: params.actorId ?? params.buyerId,
    metadata: {
      action_type: params.actionType,
      activity_count: synced.activityCount,
      qualified: synced.qualified,
    },
  });

  return { recorded: true, activityCount: synced.activityCount };
}

export async function startProjectMonitoring(
  supabase: SupabaseClient,
  projectId: string,
  buyerId: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  await admin
    .from('projects')
    .update({
      monitoring_started_at: now,
      activity_count: 0,
      activity_reminder_1_sent_at: null,
      activity_reminder_2_sent_at: null,
      archived_at: null,
      archive_reason: null,
      long_term_archived_at: null,
    })
    .eq('id', projectId)
    .eq('buyer_id', buyerId);

  await logMarketplaceAudit(supabase, {
    entity_type: 'project',
    entity_id: projectId,
    action: 'monitoring_started',
    actor_id: buyerId,
  });
}

export async function archiveProjectForInactivity(
  supabase: SupabaseClient,
  project: Pick<ProjectRow, 'id' | 'buyer_id' | 'title'>,
  reason = ARCHIVE_REASON_INACTIVITY
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  await admin
    .from('projects')
    .update({
      status: 'archived',
      archived_at: now,
      archive_reason: reason,
      closed_at: now,
    })
    .eq('id', project.id)
    .in('status', ['published', 'receiving_proposals', 'negotiating']);

  await logMarketplaceAudit(supabase, {
    entity_type: 'project',
    entity_id: project.id,
    action: 'auto_archived',
    actor_id: null,
    metadata: { reason },
  });

  void sendNotification({
    type: NotificationType.OPEN_PROJECT_AUTO_ARCHIVED,
    recipientId: project.buyer_id,
    title: 'Project archived due to inactivity',
    message: `"${project.title}" was archived because no qualifying hiring actions were taken within 7 days. You can restore it within 90 days from My Open Projects.`,
    link: `/buyer/open-projects/${project.id}`,
    metadata: { projectId: project.id, dashboardPath: '/buyer/open-projects' },
  });

  await evaluateInactiveBuyerStatus(admin, project.buyer_id);
}

async function assertBuyerCanRestore(
  project: Pick<ProjectRow, 'archived_at' | 'long_term_archived_at'>
): Promise<void> {
  if (project.long_term_archived_at) {
    throw new Error(
      'This project is in long-term archive. Please duplicate the project and publish a new listing, or contact support.'
    );
  }
  if (!project.archived_at) throw new Error('Project is not archived');

  const daysSinceArchive =
    (Date.now() - new Date(project.archived_at).getTime()) / 86400000;
  if (daysSinceArchive > ARCHIVE_RESTORE_WINDOW_DAYS) {
    throw new Error(
      'The 90-day restore window has expired. Duplicate this project and publish a fresh listing instead.'
    );
  }
}

export async function restoreArchivedProject(
  supabase: SupabaseClient,
  projectId: string,
  actorId: string,
  options: { asFounder?: boolean } = {}
): Promise<{ project: ProjectRow }> {
  const admin = createSupabaseAdminClient();

  let query = admin
    .from('projects')
    .select('id, buyer_id, title, status, archived_at, long_term_archived_at, activity_count, monitoring_started_at, activity_reminder_1_sent_at, activity_reminder_2_sent_at')
    .eq('id', projectId)
    .eq('status', 'archived')
    .is('deleted_at', null);

  if (!options.asFounder) {
    query = query.eq('buyer_id', actorId);
  }

  const { data: project, error } = await query.maybeSingle();

  if (error) throw error;
  if (!project) throw new Error('Archived project not found');

  if (options.asFounder) {
    const { data: actorProfile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', actorId)
      .maybeSingle();
    if (!actorProfile?.is_admin) {
      throw new Error('Founder access required');
    }
  } else {
    await assertBuyerCanRestore(project);
  }

  const buyerId = project.buyer_id;
  const { checkBuyerPublishingLimits } = await import('./buyerRestrictions');
  const limits = await checkBuyerPublishingLimits(supabase, buyerId, projectId);
  if (!limits.canPublish) {
    throw new Error(limits.reason ?? 'Publishing limit reached');
  }

  const now = new Date().toISOString();
  const { data: restored, error: updateError } = await admin
    .from('projects')
    .update({
      status: 'published',
      published_at: now,
      archived_at: null,
      archive_reason: null,
      closed_at: null,
      long_term_archived_at: null,
      monitoring_started_at: now,
      activity_count: 0,
      activity_reminder_1_sent_at: null,
      activity_reminder_2_sent_at: null,
    })
    .eq('id', projectId)
    .select('id, buyer_id, title, status, activity_count, monitoring_started_at, activity_reminder_1_sent_at, activity_reminder_2_sent_at, archived_at, long_term_archived_at')
    .single();

  if (updateError) throw updateError;

  await logMarketplaceAudit(supabase, {
    entity_type: 'project',
    entity_id: projectId,
    action: options.asFounder ? 'founder_restored_from_archive' : 'restored_from_archive',
    actor_id: actorId,
  });

  return { project: restored as ProjectRow };
}

export async function processProjectActivityMonitoring(): Promise<{
  reminders1: number;
  reminders2: number;
  archived: number;
  longTermArchived: number;
}> {
  const admin = createSupabaseAdminClient();
  let reminders1 = 0;
  let reminders2 = 0;
  let archived = 0;
  let longTermArchived = 0;

  const { data: monitored } = await admin
    .from('projects')
    .select('id, buyer_id, title, activity_count, monitoring_started_at, activity_reminder_1_sent_at, activity_reminder_2_sent_at')
    .eq('status', 'published')
    .is('deleted_at', null)
    .not('monitoring_started_at', 'is', null)
    .eq('activity_count', 0);

  for (const project of monitored ?? []) {
    if (!project.monitoring_started_at) continue;
    const hours = hoursSince(project.monitoring_started_at);

    if (hours >= ACTIVITY_AUTO_ARCHIVE_HOURS) {
      await archiveProjectForInactivity(admin, project);
      archived += 1;
      continue;
    }

    if (hours >= ACTIVITY_REMINDER_2_HOURS && !project.activity_reminder_2_sent_at) {
      await admin
        .from('projects')
        .update({ activity_reminder_2_sent_at: new Date().toISOString() })
        .eq('id', project.id);

      void sendNotification({
        type: NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_2,
        recipientId: project.buyer_id,
        title: 'Final reminder: engage with proposals',
        message: `"${project.title}" will be auto-archived in 24 hours unless you send meaningful messages (2+), shortlist, negotiate, or hire.`,
        link: `/buyer/open-projects/${project.id}?tab=proposals`,
        metadata: { projectId: project.id, dashboardPath: '/buyer/open-projects' },
      });
      reminders2 += 1;
      continue;
    }

    if (hours >= ACTIVITY_REMINDER_1_HOURS && !project.activity_reminder_1_sent_at) {
      await admin
        .from('projects')
        .update({ activity_reminder_1_sent_at: new Date().toISOString() })
        .eq('id', project.id);

      void sendNotification({
        type: NotificationType.OPEN_PROJECT_ACTIVITY_REMINDER_1,
        recipientId: project.buyer_id,
        title: 'Reminder: review your proposals',
        message: `"${project.title}" has no qualifying hiring activity yet. Send meaningful messages (2+), shortlist, negotiate, or hire to keep it visible.`,
        link: `/buyer/open-projects/${project.id}?tab=proposals`,
        metadata: { projectId: project.id, dashboardPath: '/buyer/open-projects' },
      });
      reminders1 += 1;
    }
  }

  const restoreCutoff = new Date(
    Date.now() - ARCHIVE_RESTORE_WINDOW_DAYS * 86400000
  ).toISOString();

  const { data: expiredArchives } = await admin
    .from('projects')
    .select('id')
    .eq('status', 'archived')
    .is('long_term_archived_at', null)
    .not('archived_at', 'is', null)
    .lt('archived_at', restoreCutoff);

  for (const project of expiredArchives ?? []) {
    await admin
      .from('projects')
      .update({ long_term_archived_at: new Date().toISOString() })
      .eq('id', project.id);
    longTermArchived += 1;
  }

  return { reminders1, reminders2, archived, longTermArchived };
}

export function isProjectPubliclyVisible(status: string): boolean {
  return status === 'published' || status === 'receiving_proposals' || status === 'negotiating';
}

export async function canViewProject(
  supabase: SupabaseClient,
  project: { status: string; buyer_id: string },
  viewerId?: string | null
): Promise<boolean> {
  if (isProjectPubliclyVisible(project.status)) return true;
  if (!viewerId) return false;
  if (project.buyer_id === viewerId) return true;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', viewerId)
    .maybeSingle();

  return Boolean(profile?.is_admin);
}
