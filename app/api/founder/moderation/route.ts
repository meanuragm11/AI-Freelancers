import { NextResponse } from 'next/server';
import { logAdminAction, requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { PROJECT_DOMAIN_MODERATION } from '@/lib/moderation/constants';
export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'all';
    const status = searchParams.get('status') ?? '';
    const q = searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);

    const results: {
      chats: unknown[];
      projects: unknown[];
      proposals: unknown[];
      users: unknown[];
      stats: { pending: number; flagged: number; blocked: number; reviewed: number };
    } = {
      chats: [],
      projects: [],
      proposals: [],
      users: [],
      stats: { pending: 0, flagged: 0, blocked: 0, reviewed: 0 },
    };

    const [statsRes, chatsRes, projectsRes, proposalsRes, usersRes] = await Promise.all([
      supabaseAdmin.from('moderation_logs').select('status'),
      type === 'all' || type === 'chat'
        ? supabaseAdmin
            .from('chat_moderation')
            .select(
              `
              *,
              sender:profiles!sender_id(id, full_name, avatar_url),
              message:messages!message_id(id, content, created_at)
            `
            )
            .order('created_at', { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [] }),
      type === 'all' || type === 'project'
        ? supabaseAdmin
            .from('project_moderation')
            .select(
              `
              *,
              buyer:profiles!buyer_id(id, full_name, avatar_url),
              project:projects!project_id(id, title, status)
            `
            )
            .order('created_at', { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [] }),
      type === 'all' || type === 'proposal'
        ? supabaseAdmin
            .from('proposal_moderation')
            .select(
              `
              *,
              builder:profiles!builder_id(id, full_name, avatar_url),
              proposal:project_proposals!proposal_id(id, status, proposed_amount_usd)
            `
            )
            .order('created_at', { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [] }),
      type === 'all' || type === 'user'
        ? supabaseAdmin
            .from('user_trust_scores')
            .select(
              `
              *,
              profile:profiles!user_id(id, full_name, avatar_url, account_status)
            `
            )
            .order('offence_count', { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [] }),
    ]);

    (statsRes.data ?? []).forEach((row: { status: string }) => {
      if (row.status === 'pending') results.stats.pending++;
      else if (row.status === 'flagged') results.stats.flagged++;
      else if (row.status === 'blocked') results.stats.blocked++;
      else if (row.status === 'reviewed') results.stats.reviewed++;
    });

    const filterByStatus = <T extends { status?: string }>(items: T[]) =>
      status ? items.filter((i) => i.status === status) : items;

    const filterByQuery = <T extends Record<string, unknown>>(items: T[], fields: string[]) => {
      if (!q) return items;
      const lower = q.toLowerCase();
      return items.filter((item) =>
        fields.some((f) => {
          const val = item[f];
          return typeof val === 'string' && val.toLowerCase().includes(lower);
        })
      );
    };

    results.chats = filterByQuery(
      filterByStatus((chatsRes.data ?? []) as Record<string, unknown>[]),
      ['reason', 'category', 'content_snapshot']
    );
    results.projects = filterByQuery(
      filterByStatus((projectsRes.data ?? []) as Record<string, unknown>[]),
      ['reason', 'category', 'title_snapshot', 'description_snapshot', 'domain', 'recommended_action']
    );
    results.proposals = filterByQuery(
      filterByStatus((proposalsRes.data ?? []) as Record<string, unknown>[]),
      ['reason', 'category', 'cover_letter_snapshot']
    );
    results.users = filterByQuery((usersRes.data ?? []) as Record<string, unknown>[], []);

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('Founder moderation list error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      action?: string;
      targetType?: string;
      targetId?: string;
      moderationRecordId?: string;
      reason?: string;
    };

    const { action, targetType, targetId, moderationRecordId, reason } = body;

    if (!action || !targetType || !targetId) {
      return NextResponse.json({ error: 'action, targetType, and targetId are required' }, { status: 400 });
    }

    const validActions = ['warn', 'suspend', 'ban', 'remove_content', 'restore_content', 'approve', 'dismiss'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await supabaseAdmin.from('founder_moderation_actions').insert({
      founder_id: auth.actor.id,
      action,
      target_type: targetType,
      target_id: targetId,
      moderation_record_id: moderationRecordId ?? null,
      reason: reason?.trim() ?? null,
    });

    if (action === 'approve' || action === 'dismiss') {
      const newStatus = action === 'approve' ? 'approved' : 'reviewed';
      if (action === 'approve' && targetType === 'project') {
        await restoreContent(targetType, targetId, moderationRecordId);
      }
      await updateModerationStatus(targetType, targetId, moderationRecordId, newStatus, auth.actor.id);
      if (targetType === 'project' && action === 'approve') {
        await notifyProjectDomainReviewDecision(targetId, 'approved', reason);
      }
    }

    if (action === 'remove_content') {
      await removeContent(targetType, targetId, moderationRecordId);
      await updateModerationStatus(targetType, targetId, moderationRecordId, 'blocked', auth.actor.id);
      if (targetType === 'project') {
        await notifyProjectDomainReviewDecision(targetId, 'rejected', reason);
      }
    }

    if (action === 'restore_content') {
      await restoreContent(targetType, targetId, moderationRecordId);
      await updateModerationStatus(targetType, targetId, moderationRecordId, 'approved', auth.actor.id);
    }

    if (action === 'warn' && targetType !== 'user') {
      const userId = await resolveUserId(targetType, targetId, moderationRecordId);
      if (userId) {
        const { count } = await supabaseAdmin
          .from('user_moderation_warnings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        await supabaseAdmin.from('user_moderation_warnings').insert({
          user_id: userId,
          offence_number: (count ?? 0) + 1,
          reason: reason?.trim() ?? 'Founder warning',
          source_entity_type: targetType === 'chat' ? 'chat' : targetType === 'project' ? 'project' : 'proposal',
          source_entity_id: targetId,
        });
      }
    }

    if ((action === 'suspend' || action === 'ban') && targetType === 'user') {
      const updates =
        action === 'ban'
          ? {
              account_status: 'banned',
              suspension_type: null,
              suspended_at: now,
              suspended_by: auth.actor.id,
              suspension_reason: reason?.trim() ?? 'Founder ban',
            }
          : {
              account_status: 'suspended',
              suspension_type: 'full',
              suspended_at: now,
              suspended_by: auth.actor.id,
              suspension_reason: reason?.trim() ?? 'Founder suspension',
            };
      await supabaseAdmin.from('profiles').update(updates).eq('id', targetId);
      if (action === 'ban') {
        await supabaseAdmin.auth.admin.updateUserById(targetId, { ban_duration: '876000h' });
      }
    }

    await logAdminAction({
      actor: auth.actor,
      action: `moderation.${action}`,
      targetType,
      targetId,
      metadata: { reason: reason?.trim() ?? null, moderationRecordId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Founder moderation action error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function updateModerationStatus(
  targetType: string,
  targetId: string,
  moderationRecordId: string | undefined,
  status: string,
  reviewerId: string
) {
  const reviewedAt = new Date().toISOString();

  if (targetType === 'chat') {
    const query = supabaseAdmin.from('chat_moderation').update({ status, updated_at: reviewedAt });
    if (moderationRecordId) await query.eq('id', moderationRecordId);
    else await query.eq('message_id', targetId);
    await supabaseAdmin.from('messages').update({ moderation_status: status }).eq('id', targetId);
  } else if (targetType === 'project') {
    const query = supabaseAdmin.from('project_moderation').update({ status, updated_at: reviewedAt });
    if (moderationRecordId) await query.eq('id', moderationRecordId);
    else await query.eq('project_id', targetId);
    const projectModerationStatus = status === 'blocked' ? 'rejected' : status === 'reviewed' ? 'flagged' : status;
    await supabaseAdmin
      .from('projects')
      .update({ moderation_status: projectModerationStatus })
      .eq('id', targetId);
  } else if (targetType === 'proposal') {
    const query = supabaseAdmin.from('proposal_moderation').update({ status, updated_at: reviewedAt });
    if (moderationRecordId) await query.eq('id', moderationRecordId);
    else await query.eq('proposal_id', targetId);
    await supabaseAdmin.from('project_proposals').update({ moderation_status: status }).eq('id', targetId);
  }

  await supabaseAdmin
    .from('moderation_logs')
    .update({ status, reviewed_at: reviewedAt, reviewed_by: reviewerId })
    .eq('entity_type', targetType === 'chat' ? 'chat' : targetType)
    .eq('entity_id', targetId);
}

async function removeContent(targetType: string, targetId: string, moderationRecordId?: string) {
  if (targetType === 'chat') {
    await supabaseAdmin.from('messages').update({ is_hidden: true, moderation_status: 'blocked' }).eq('id', targetId);
    const query = supabaseAdmin.from('chat_moderation').update({ is_hidden: true, status: 'blocked' });
    if (moderationRecordId) await query.eq('id', moderationRecordId);
    else await query.eq('message_id', targetId);
  } else if (targetType === 'project') {
    await supabaseAdmin
      .from('projects')
      .update({ status: 'draft', moderation_status: 'rejected' })
      .eq('id', targetId);
  } else if (targetType === 'proposal') {
    await supabaseAdmin.from('project_proposals').update({ status: 'cancelled', moderation_status: 'blocked' }).eq('id', targetId);
  }
}

async function restoreContent(targetType: string, targetId: string, moderationRecordId?: string) {
  if (targetType === 'chat') {
    await supabaseAdmin.from('messages').update({ is_hidden: false, moderation_status: 'approved', is_flagged: false }).eq('id', targetId);
    const query = supabaseAdmin.from('chat_moderation').update({ is_hidden: false, status: 'approved' });
    if (moderationRecordId) await query.eq('id', moderationRecordId);
    else await query.eq('message_id', targetId);
  } else if (targetType === 'project') {
    await supabaseAdmin.from('projects').update({ status: 'published', moderation_status: 'approved' }).eq('id', targetId);
  } else if (targetType === 'proposal') {
    await supabaseAdmin.from('project_proposals').update({ status: 'submitted', moderation_status: 'approved' }).eq('id', targetId);
  }
}

async function resolveUserId(
  targetType: string,
  targetId: string,
  moderationRecordId?: string
): Promise<string | null> {
  if (targetType === 'chat') {
    const { data } = moderationRecordId
      ? await supabaseAdmin.from('chat_moderation').select('sender_id').eq('id', moderationRecordId).maybeSingle()
      : await supabaseAdmin.from('chat_moderation').select('sender_id').eq('message_id', targetId).maybeSingle();
    return data?.sender_id ?? null;
  }
  if (targetType === 'project') {
    const { data } = await supabaseAdmin.from('project_moderation').select('buyer_id').eq('project_id', targetId).maybeSingle();
    return data?.buyer_id ?? null;
  }
  if (targetType === 'proposal') {
    const { data } = await supabaseAdmin.from('proposal_moderation').select('builder_id').eq('proposal_id', targetId).maybeSingle();
    return data?.builder_id ?? null;
  }
  return targetId;
}

async function notifyProjectDomainReviewDecision(
  projectId: string,
  decision: 'approved' | 'rejected',
  founderReason?: string
) {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, buyer_id, title')
    .eq('id', projectId)
    .maybeSingle();

  if (!project?.buyer_id) return;

  const approved = decision === 'approved';
  await sendNotification({
    type: NotificationType.SYSTEM,
    recipientId: project.buyer_id,
    title: approved ? 'Project approved' : 'Project review complete',
    message: approved
      ? `Your project "${project.title}" has been approved and is now visible on Zelance.`
      : founderReason?.trim()
        ? `${PROJECT_DOMAIN_MODERATION.rejectedUserMessage} (${founderReason.trim()})`
        : PROJECT_DOMAIN_MODERATION.rejectedUserMessage,
    link: `/buyer/open-projects/${projectId}`,
    metadata: {
      projectId,
      projectTitle: project.title,
      founderDecision: decision,
      idempotencyKey: `project-founder-review-${projectId}-${decision}`,
    },
  });
}
