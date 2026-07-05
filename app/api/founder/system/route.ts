import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';

function startOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function GET() {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  const todayIso = startOfTodayIso();

  const [
    emailLog24h,
    lastEmailLog,
    notifications24h,
    unreadNotifications,
    paymentFailuresToday,
    withdrawalFailures,
    systemAlerts,
    buckets,
  ] = await Promise.all([
    supabaseAdmin.from('notification_email_log').select('id', { count: 'exact', head: true }).gte('sent_at', todayIso),
    supabaseAdmin.from('notification_email_log').select('sent_at').order('sent_at', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
    supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
    supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['expired', 'failed'])
      .gte('created_at', todayIso),
    supabaseAdmin.from('builder_withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabaseAdmin
      .from('system_alerts')
      .select('id, risk_level, alert_type, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin.storage.listBuckets(),
  ]);

  return NextResponse.json({
    email: {
      sentToday: emailLog24h.count ?? 0,
      lastSentAt: lastEmailLog.data?.sent_at ?? null,
      status: 'operational',
    },
    notifications: {
      createdToday: notifications24h.count ?? 0,
      unread: unreadNotifications.count ?? 0,
      status: 'operational',
    },
    payments: {
      failuresToday: paymentFailuresToday.count ?? 0,
      status: (paymentFailuresToday.count ?? 0) > 0 ? 'degraded' : 'operational',
    },
    withdrawals: {
      failedCount: withdrawalFailures.count ?? 0,
      status: (withdrawalFailures.count ?? 0) > 0 ? 'degraded' : 'operational',
    },
    storage: {
      buckets: (buckets.data ?? []).map((b) => ({ id: b.id, name: b.name, public: b.public })),
      status: buckets.error ? 'unknown' : 'operational',
    },
    backgroundJobs: {
      status: 'not_configured',
      note: 'No background job queue table exists yet. Wire this up once a job runner (e.g. pg_cron, Inngest, or a queue table) is introduced.',
    },
    apiErrors: {
      status: 'not_configured',
      note: 'No centralized API error log table exists yet. Consider shipping server errors into system_alerts or an external log sink (e.g. Sentry).',
    },
    failedUploads: {
      status: 'not_configured',
      note: 'No dedicated failed-upload tracking exists yet. Storage bucket status above is the closest available signal.',
    },
    systemAlerts: systemAlerts.data ?? [],
  });
}

export async function PATCH(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { alertId, status } = await req.json();
    if (!alertId || !status) {
      return NextResponse.json({ error: 'alertId and status are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('system_alerts')
      .update({ status })
      .eq('id', alertId)
      .select('*')
      .single();

    if (error) throw error;

    await logAdminAction({
      actor: auth.actor,
      action: 'system_alert.update',
      targetType: 'system_alert',
      targetId: alertId,
      metadata: { status },
    });

    return NextResponse.json({ alert: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
