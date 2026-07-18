import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { SUPPORT_ARBITRATION_RELATED_CATEGORIES } from '@/lib/support/constants';
import { logBusinessEvent } from '@/lib/events/businessEvents';
import { ACTIVE_DISPUTE_STATUSES, DISPUTE_STATUS_LABELS } from '@/lib/disputes/constants';
import { notifyFoundersOfDisputeEvent } from '@/lib/disputes/founderNotifications';

type EvidenceFile = {
  name: string;
  url: string;
  type?: string;
  size?: number;
};

type CollabRecord = {
  id: string;
  title?: string | null;
  description?: string | null;
  buyer_id: string;
  builder_id: string;
  status?: string | null;
  escrow_amount_usd?: string | number | null;
  payment_type?: string | null;
  service_id?: string | null;
  project_request_id?: string | null;
  created_at?: string | null;
};

type DisputeBody = {
  collabId?: string;
  action?: 'open' | 'respond' | 'comment' | 'withdraw' | 'request_arbitration' | 'propose_resolution';
  primaryReason?: string;
  detailedExplanation?: string;
  eventTimeline?: string;
  response?: string;
  comment?: string;
  proposal?: string;
  files?: EvidenceFile[];
};

type DisputeTimelineEntry = {
  id: string;
  dispute_id: string;
  collab_id: string;
  actor_id: string | null;
  actor_role: string;
  entry_type: string;
  description: string;
  metadata: Record<string, unknown>;
  files: EvidenceFile[] | null;
  created_at: string;
};

type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function serializeRouteError(error: unknown) {
  if (error && typeof error === 'object') {
    const err = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    return {
      message: typeof err.message === 'string' ? err.message : 'Unknown error',
      code: typeof err.code === 'string' ? err.code : undefined,
      details: typeof err.details === 'string' ? err.details : undefined,
      hint: typeof err.hint === 'string' ? err.hint : undefined,
    };
  }

  return { message: error instanceof Error ? error.message : 'Unknown error' };
}

function logDisputeRouteError(
  error: unknown,
  context: { requestId: string; method: string; collabId?: string | null; userId?: string; action?: string }
) {
  console.error('[disputes] route error', {
    ...context,
    error: serializeRouteError(error),
  });
}

function disputeErrorResponse(
  error: unknown,
  context: { method: string; collabId?: string | null; userId?: string; action?: string },
  message = 'Unable to load dispute state'
) {
  const requestId = crypto.randomUUID();
  logDisputeRouteError(error, { requestId, ...context });
  return NextResponse.json({ error: message, requestId }, { status: 500 });
}

async function getServerUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

function otherParticipant(collab: CollabRecord, actorId: string) {
  return collab.buyer_id === actorId ? collab.builder_id : collab.buyer_id;
}

function actorRole(collab: CollabRecord, actorId: string): 'buyer' | 'freelancer' | null {
  if (collab.buyer_id === actorId) return 'buyer';
  if (collab.builder_id === actorId) return 'freelancer';
  return null;
}

async function fetchCollabForActor(collabId: string, actorId: string) {
  const { data: collab, error } = await supabaseAdmin
    .from('collabs')
    .select('id, title, description, buyer_id, builder_id, status, escrow_amount_usd, payment_type, service_id, project_request_id, created_at')
    .eq('id', collabId)
    .maybeSingle();

  if (error) throw error;
  if (!collab) return { collab: null, role: null };

  const collabRecord = collab as CollabRecord;
  return { collab: collabRecord, role: actorRole(collabRecord, actorId) };
}

async function getLatestDispute(collabId: string) {
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select('*')
    .eq('collab_id', collabId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getActiveDispute(collabId: string) {
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select('*')
    .eq('collab_id', collabId)
    .in('status', ACTIVE_DISPUTE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getDisputeForDisplay(collabId: string) {
  const activeDispute = await getActiveDispute(collabId);
  if (activeDispute) return activeDispute;

  return getLatestDispute(collabId);
}

async function reopenSupportTicketsForArbitration(buyerId: string, collabId: string) {
  const { data: tickets, error } = await supabaseAdmin
    .from('support_tickets')
    .select('id, escrow_id, project_id, category')
    .eq('user_id', buyerId)
    .in('status', ['resolved', 'closed']);

  if (error) throw error;

  const relatedTickets = (tickets ?? []).filter(
    (ticket) =>
      ticket.escrow_id === collabId ||
      ticket.project_id === collabId ||
      (SUPPORT_ARBITRATION_RELATED_CATEGORIES as readonly string[]).includes(ticket.category)
  );

  for (const ticket of relatedTickets) {
    const { error: updateError } = await supabaseAdmin
      .from('support_tickets')
      .update({ status: 'arbitration_requested' })
      .eq('id', ticket.id);

    if (updateError) throw updateError;

    await supabaseAdmin.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      sender_role: 'system',
      body: 'Arbitration was requested on the related escrow dispute. This ticket has been reopened for platform review.',
      attachments: [],
    });
  }
}

async function getTimelineWithActors(disputeId: string) {
  const { data: entries, error } = await supabaseAdmin
    .from('dispute_timeline_entries')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const timeline = (entries ?? []) as DisputeTimelineEntry[];
  const actorIds = Array.from(
    new Set(timeline.map((entry) => entry.actor_id).filter((actorId): actorId is string => Boolean(actorId)))
  );

  if (actorIds.length === 0) {
    return timeline.map((entry) => ({ ...entry, actor: null }));
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', actorIds);

  if (profileError) throw profileError;

  const profilesById = new Map(
    ((profiles ?? []) as ProfileSummary[]).map((profile) => [
      profile.id,
      { full_name: profile.full_name, avatar_url: profile.avatar_url },
    ])
  );

  return timeline.map((entry) => ({
    ...entry,
    actor: entry.actor_id ? profilesById.get(entry.actor_id) ?? null : null,
  }));
}

async function addTimelineEntry(params: {
  disputeId: string;
  collabId: string;
  actorId: string | null;
  actorRole: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  files?: EvidenceFile[];
}) {
  const { data: entry, error } = await supabaseAdmin
    .from('dispute_timeline_entries')
    .insert({
      dispute_id: params.disputeId,
      collab_id: params.collabId,
      actor_id: params.actorId,
      actor_role: params.actorRole,
      entry_type: params.type,
      description: params.description,
      metadata: params.metadata ?? {},
      files: params.files ?? [],
    })
    .select('id')
    .single();

  if (error) throw error;

  if (params.files?.length) {
    const evidenceRows = params.files.map((file) => ({
      dispute_id: params.disputeId,
      timeline_entry_id: entry.id,
      uploaded_by: params.actorId,
      file_name: file.name,
      file_url: file.url,
      file_type: file.type ?? null,
      file_size: file.size ?? null,
    }));

    const { error: evidenceError } = await supabaseAdmin.from('dispute_evidence').insert(evidenceRows);
    if (evidenceError) throw evidenceError;
  }

  return entry.id as string;
}

async function addSystemMessage(collabId: string, actorId: string, content: string, eventType: string) {
  const { error } = await supabaseAdmin.from('messages').insert({
    collab_id: collabId,
    sender_id: actorId,
    text: content,
    content,
    message_kind: 'system',
    system_event_type: eventType,
    is_read: false,
  });

  if (error) throw error;
}

async function notifyParticipant(params: {
  recipientId: string;
  actorId: string;
  collab: CollabRecord;
  title: string;
  message: string;
  eventKey: string;
}) {
  await sendNotification({
    type: NotificationType.DISPUTE_EVENT,
    recipientId: params.recipientId,
    title: params.title,
    message: params.message,
    link: `/collab/${params.collab.id}`,
    metadata: {
      collabId: params.collab.id,
      projectName: params.collab.title || 'Your project',
      projectStatus: 'Disputed',
      actorId: params.actorId,
      idempotencyKey: `dispute:${params.collab.id}:${params.eventKey}:${params.recipientId}`,
    },
  });
}

async function buildArbitrationSnapshot(collabId: string) {
  const [milestonesRes, messagesRes, notificationsRes, emailLogsRes] = await Promise.all([
    supabaseAdmin
      .from('milestones')
      .select('*')
      .eq('collab_id', collabId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('messages')
      .select('id, sender_id, text, content, message_kind, system_event_type, created_at, edited_at, deleted_at')
      .eq('collab_id', collabId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('notifications')
      .select('id, user_id, type, title, message, link, metadata, created_at')
      .contains('metadata', { collabId })
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('notification_email_log')
      .select('id, recipient_id, conversation_id, notification_type, sent_at')
      .eq('conversation_id', collabId)
      .order('sent_at', { ascending: true }),
  ]);

  return {
    capturedAt: new Date().toISOString(),
    milestones: milestonesRes.data ?? [],
    messages: messagesRes.data ?? [],
    notifications: notificationsRes.data ?? [],
    emailLogs: emailLogsRes.data ?? [],
  };
}

export async function GET(req: Request) {
  let userId: string | undefined;
  let collabId: string | null = null;

  try {
    const user = await getServerUser();
    userId = user?.id;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    collabId = searchParams.get('collabId');
    if (!collabId) return NextResponse.json({ error: 'collabId is required' }, { status: 400 });

    const { collab, role } = await fetchCollabForActor(collabId, user.id);
    if (!collab || !role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const dispute = await getDisputeForDisplay(collabId);
    if (!dispute) return NextResponse.json({ dispute: null, timeline: [], evidence: [] });

    const [timeline, evidenceRes] = await Promise.all([
      getTimelineWithActors(dispute.id),
      supabaseAdmin
        .from('dispute_evidence')
        .select('*')
        .eq('dispute_id', dispute.id)
        .order('created_at', { ascending: true }),
    ]);

    if (evidenceRes.error) throw evidenceRes.error;

    return NextResponse.json({
      dispute,
      timeline,
      evidence: evidenceRes.data ?? [],
      role,
    });
  } catch (error: unknown) {
    return disputeErrorResponse(error, { method: 'GET', collabId, userId });
  }
}

export async function POST(req: Request) {
  let userId: string | undefined;
  let collabId: string | undefined;

  try {
    const user = await getServerUser();
    userId = user?.id;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as DisputeBody;
    collabId = body.collabId;
    if (!body.collabId) return NextResponse.json({ error: 'collabId is required' }, { status: 400 });

    const { collab, role } = await fetchCollabForActor(body.collabId, user.id);
    if (!collab || !role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (role !== 'buyer') return NextResponse.json({ error: 'Only the buyer can open a dispute' }, { status: 403 });

    if (!body.primaryReason || !body.detailedExplanation || !body.eventTimeline) {
      return NextResponse.json(
        { error: 'primaryReason, detailedExplanation, and eventTimeline are required' },
        { status: 400 }
      );
    }

    const existing = await getActiveDispute(body.collabId);
    if (existing) return NextResponse.json({ error: 'An active dispute already exists' }, { status: 409 });

    const arbitrationSnapshot = await buildArbitrationSnapshot(body.collabId);
    const { data: dispute, error } = await supabaseAdmin
      .from('disputes')
      .insert({
        collab_id: collab.id,
        buyer_id: collab.buyer_id,
        freelancer_id: collab.builder_id,
        opened_by: user.id,
        status: 'open',
        primary_reason: body.primaryReason,
        detailed_explanation: body.detailedExplanation,
        event_timeline: body.eventTimeline,
        escrow_frozen_at: new Date().toISOString(),
        collab_status_before: collab.status,
        escrow_snapshot: {
          amountUsd: collab.escrow_amount_usd,
          paymentType: collab.payment_type,
        },
        arbitration_snapshot: arbitrationSnapshot,
      })
      .select('*')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('collabs').update({ status: 'disputed' }).eq('id', collab.id);

    await addTimelineEntry({
      disputeId: dispute.id,
      collabId: collab.id,
      actorId: user.id,
      actorRole: role,
      type: 'opened',
      description: 'Buyer opened a dispute and submitted the initial complaint.',
      metadata: {
        primaryReason: body.primaryReason,
        detailedExplanation: body.detailedExplanation,
        eventTimeline: body.eventTimeline,
      },
      files: body.files ?? [],
    });

    await addTimelineEntry({
      disputeId: dispute.id,
      collabId: collab.id,
      actorId: null,
      actorRole: 'system',
      type: 'escrow_frozen',
      description: 'Escrow is frozen and milestone release, approval, completion, cancellation, reviews, and payment finalization are paused.',
    });

    await addSystemMessage(
      collab.id,
      user.id,
      'Dispute opened. Escrow is frozen while both parties work through the Dispute Center. Messaging remains available.',
      'dispute_opened'
    );

    await notifyParticipant({
      recipientId: collab.builder_id,
      actorId: user.id,
      collab,
      title: 'Dispute opened: escrow frozen',
      message: `A dispute was opened for "${collab.title}". Review the buyer complaint and respond in the Dispute Center.`,
      eventKey: `opened:${dispute.id}`,
    });

    void logBusinessEvent({
      eventType: 'dispute.opened',
      entityType: 'dispute',
      entityId: dispute.id,
      collabId: collab.id,
      actorId: user.id,
      amountUsd: collab.escrow_amount_usd ? Number(collab.escrow_amount_usd) : null,
      summary: `Dispute opened for "${collab.title || 'a project'}": ${body.primaryReason}`,
    });

    void notifyFoundersOfDisputeEvent({
      disputeId: dispute.id,
      title: 'New dispute opened',
      message: `A buyer opened a dispute for "${collab.title || 'a project'}".`,
      idempotencyKey: `opened:${dispute.id}`,
    });

    return NextResponse.json({ dispute });
  } catch (error: unknown) {
    return disputeErrorResponse(error, { method: 'POST', collabId, userId, action: 'open' }, 'Unable to open dispute');
  }
}

export async function PATCH(req: Request) {
  let userId: string | undefined;
  let collabId: string | undefined;
  let action: string | undefined;

  try {
    const user = await getServerUser();
    userId = user?.id;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as DisputeBody;
    collabId = body.collabId;
    action = body.action;
    if (!body.collabId || !body.action) {
      return NextResponse.json({ error: 'collabId and action are required' }, { status: 400 });
    }

    const { collab, role } = await fetchCollabForActor(body.collabId, user.id);
    if (!collab || !role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const dispute = await getActiveDispute(body.collabId);
    if (!dispute) return NextResponse.json({ error: 'No active dispute found' }, { status: 404 });

    const recipientId = otherParticipant(collab, user.id);
    let nextStatus: string | null = null;
    let timelineType: string = body.action;
    let description = '';
    let notificationTitle = '';
    let notificationMessage = '';
    let systemMessage = '';
    let updatePayload: Record<string, unknown> = {};

    if (body.action === 'respond') {
      if (role !== 'freelancer') return NextResponse.json({ error: 'Only the freelancer can respond' }, { status: 403 });
      if (dispute.freelancer_response_submitted_at) {
        return NextResponse.json({ error: 'Freelancer response has already been submitted' }, { status: 409 });
      }
      if (!body.response?.trim()) return NextResponse.json({ error: 'response is required' }, { status: 400 });

      nextStatus = 'open';
      updatePayload = {
        status: nextStatus,
        freelancer_response: body.response,
        freelancer_response_submitted_at: new Date().toISOString(),
      };
      description = 'Freelancer submitted an immutable response.';
      notificationTitle = 'Freelancer responded to dispute';
      notificationMessage = `The freelancer responded to the dispute for "${collab.title}". Review their statement in the Dispute Center.`;
      systemMessage = 'Freelancer submitted their dispute response.';
    } else if (body.action === 'comment') {
      if (!body.comment?.trim() && !body.files?.length) {
        return NextResponse.json({ error: 'comment or files are required' }, { status: 400 });
      }
      description = body.comment?.trim() || 'Evidence added to the dispute.';
      notificationTitle = 'New dispute update';
      notificationMessage = `There is a new dispute update for "${collab.title}".`;
      systemMessage = 'A new dispute update was added in the Dispute Center.';
    } else if (body.action === 'withdraw') {
      if (role !== 'buyer') return NextResponse.json({ error: 'Only the buyer can withdraw a dispute' }, { status: 403 });
      nextStatus = 'closed';
      timelineType = 'withdrawn';
      updatePayload = {
        status: nextStatus,
        closed_at: new Date().toISOString(),
        decision_type: 'cancelled',
        decision_summary: body.comment || 'Buyer withdrew the dispute.',
        payment_execution_status: 'not_required',
      };
      description = body.comment || 'Buyer withdrew the dispute.';
      notificationTitle = 'Dispute withdrawn';
      notificationMessage = `The buyer withdrew the dispute for "${collab.title}". Escrow controls have been restored.`;
      systemMessage = 'The buyer withdrew the dispute. Escrow controls have been restored.';
    } else if (body.action === 'request_arbitration') {
      nextStatus = 'under_investigation';
      timelineType = 'arbitration_requested';
      updatePayload = {
        status: nextStatus,
        arbitration_requested_at: new Date().toISOString(),
        arbitration_requested_by: user.id,
        investigation_started_at: new Date().toISOString(),
        arbitration_snapshot: await buildArbitrationSnapshot(body.collabId),
      };
      description = body.comment || 'Arbitration was requested.';
      notificationTitle = 'Arbitration requested';
      notificationMessage = `Arbitration was requested for "${collab.title}". Zelance can review the preserved dispute record.`;
      systemMessage = 'Arbitration was requested. The dispute record has been preserved for review.';
    } else if (body.action === 'propose_resolution') {
      if (role !== 'freelancer') {
        return NextResponse.json({ error: 'Only the freelancer can propose a resolution' }, { status: 403 });
      }
      if (!body.proposal?.trim()) return NextResponse.json({ error: 'proposal is required' }, { status: 400 });
      nextStatus = 'open';
      timelineType = 'resolution_proposed';
      updatePayload = {
        status: nextStatus,
        freelancer_resolution_proposal: body.proposal,
      };
      description = body.proposal;
      notificationTitle = 'Resolution proposed';
      notificationMessage = `The freelancer proposed a resolution for "${collab.title}".`;
      systemMessage = 'The freelancer proposed a resolution. Buyer review is requested.';
    } else {
      return NextResponse.json({ error: 'Unsupported dispute action' }, { status: 400 });
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('disputes')
        .update(updatePayload)
        .eq('id', dispute.id);
      if (updateError) throw updateError;
    }

    if (body.action === 'withdraw') {
      await supabaseAdmin
        .from('collabs')
        .update({ status: dispute.collab_status_before || 'funded' })
        .eq('id', collab.id);
    }

    if (body.action === 'comment' || body.action === 'respond') {
      void notifyFoundersOfDisputeEvent({
        disputeId: dispute.id,
        title: body.files?.length ? 'New dispute evidence' : 'New dispute reply',
        message: `There is a new update on the dispute for "${collab.title || 'a project'}".`,
        idempotencyKey: `${body.action}:${dispute.id}:${Date.now()}`,
      });
    }

    if (body.action === 'request_arbitration') {
      await reopenSupportTicketsForArbitration(collab.buyer_id, collab.id);
    }

    await addTimelineEntry({
      disputeId: dispute.id,
      collabId: collab.id,
      actorId: user.id,
      actorRole: role,
      type: timelineType,
      description,
      metadata: {
        status: nextStatus ? DISPUTE_STATUS_LABELS[nextStatus] : DISPUTE_STATUS_LABELS[dispute.status],
        comment: body.comment,
        response: body.action === 'respond' ? body.response : undefined,
      },
      files: body.files ?? [],
    });

    await addSystemMessage(collab.id, user.id, systemMessage, `dispute_${timelineType}`);

    await notifyParticipant({
      recipientId,
      actorId: user.id,
      collab,
      title: notificationTitle,
      message: notificationMessage,
      eventKey: `${body.action}:${dispute.id}:${Date.now()}`,
    });

    if (body.action === 'withdraw' || body.action === 'request_arbitration') {
      void logBusinessEvent({
        eventType: `dispute.${timelineType}`,
        entityType: 'dispute',
        entityId: dispute.id,
        collabId: collab.id,
        actorId: user.id,
        summary: description,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return disputeErrorResponse(error, { method: 'PATCH', collabId, userId, action }, 'Unable to update dispute');
  }
}
