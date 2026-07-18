import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import {
  ACTIVE_ESCROW_COLLAB_STATUSES,
  ACTIVE_PROJECT_STATUSES,
  OPEN_DISPUTE_STATUSES,
  OPEN_TICKET_STATUSES,
  PENDING_MODERATION_STATUSES,
} from '@/lib/founder/overview';

function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 86400000).toISOString();
}

export async function GET() {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const since = thirtyDaysAgoIso();

    const [
      activeUsers,
      activeProjects,
      openTickets,
      openDisputes,
      pendingReviews,
      escrowRows,
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_active_at', since),
      supabaseAdmin
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .in('status', [...ACTIVE_PROJECT_STATUSES])
        .is('deleted_at', null)
        .is('archived_at', null),
      supabaseAdmin
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .in('status', [...OPEN_TICKET_STATUSES]),
      supabaseAdmin
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .in('status', [...OPEN_DISPUTE_STATUSES]),
      supabaseAdmin
        .from('moderation_logs')
        .select('id', { count: 'exact', head: true })
        .in('status', [...PENDING_MODERATION_STATUSES]),
      supabaseAdmin
        .from('collabs')
        .select('escrow_amount_usd')
        .in('status', [...ACTIVE_ESCROW_COLLAB_STATUSES]),
    ]);

    const activeEscrowValue = (escrowRows.data ?? []).reduce(
      (sum, row) => sum + Number(row.escrow_amount_usd || 0),
      0
    );

    return NextResponse.json({
      activeUsers: activeUsers.count ?? 0,
      activeProjects: activeProjects.count ?? 0,
      openSupportTickets: openTickets.count ?? 0,
      openDisputes: openDisputes.count ?? 0,
      pendingAiReviews: pendingReviews.count ?? 0,
      activeEscrowValue,
    });
  } catch (error: unknown) {
    console.error('Founder overview snapshot error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
