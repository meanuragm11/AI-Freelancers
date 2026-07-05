import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

const OPEN_DISPUTE_STATUSES = [
  'waiting_for_freelancer',
  'waiting_for_buyer',
  'negotiation',
  'under_review',
  'arbitration_requested',
];

const OPEN_TICKET_STATUSES = ['open', 'in_progress', 'waiting_for_user', 'arbitration_requested'];
const ACTIVE_ESCROW_COLLAB_STATUSES = ['funded', 'in_progress', 'submitted', 'disputed'];

function startOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function GET() {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const todayIso = startOfTodayIso();

    const [
      totalUsers,
      activeBuyers,
      activeBuilders,
      publishedServices,
      publishedAssets,
      ordersToday,
      revenueTodayRows,
      activeEscrowRows,
      pendingWithdrawals,
      openDisputes,
      openTickets,
      recentTickets,
      recentDisputes,
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'buyer'),
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or('role.eq.builder,is_freelancer.eq.true'),
      supabaseAdmin
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      supabaseAdmin
        .from('components')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayIso),
      supabaseAdmin
        .from('transactions')
        .select('fee_usd')
        .eq('status', 'completed')
        .gte('created_at', todayIso),
      supabaseAdmin
        .from('collabs')
        .select('escrow_amount_usd')
        .in('status', ACTIVE_ESCROW_COLLAB_STATUSES),
      supabaseAdmin
        .from('builder_withdrawals')
        .select('id, amount_usd', { count: 'exact' })
        .eq('status', 'processing'),
      supabaseAdmin
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .in('status', OPEN_DISPUTE_STATUSES),
      supabaseAdmin
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .in('status', OPEN_TICKET_STATUSES),
      supabaseAdmin
        .from('support_tickets')
        .select('id, ticket_number, subject, status, priority, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('disputes')
        .select('id, collab_id, status, primary_reason, created_at')
        .in('status', OPEN_DISPUTE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const revenueToday = (revenueTodayRows.data ?? []).reduce(
      (sum, row) => sum + Number(row.fee_usd || 0),
      0
    );
    const activeEscrowTotal = (activeEscrowRows.data ?? []).reduce(
      (sum, row) => sum + Number(row.escrow_amount_usd || 0),
      0
    );
    const pendingWithdrawalTotal = (pendingWithdrawals.data ?? []).reduce(
      (sum, row) => sum + Number(row.amount_usd || 0),
      0
    );

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers.count ?? 0,
        activeBuyers: activeBuyers.count ?? 0,
        activeBuilders: activeBuilders.count ?? 0,
        publishedServices: publishedServices.count ?? 0,
        publishedAssets: publishedAssets.count ?? 0,
        ordersToday: ordersToday.count ?? 0,
        revenueToday,
        activeEscrowTotal,
        activeEscrowCount: (activeEscrowRows.data ?? []).length,
        pendingWithdrawalCount: pendingWithdrawals.count ?? 0,
        pendingWithdrawalTotal,
        openDisputes: openDisputes.count ?? 0,
        openTickets: openTickets.count ?? 0,
      },
      recentTickets: recentTickets.data ?? [],
      recentDisputes: recentDisputes.data ?? [],
    });
  } catch (error: unknown) {
    console.error('Founder overview error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
