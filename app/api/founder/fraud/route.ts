import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

const SUSPICIOUS_TRANSACTION_THRESHOLD_USD = 500;
const EXCESSIVE_DISPUTE_THRESHOLD = 2;
const EXCESSIVE_REFUND_THRESHOLD = 2;

export async function GET() {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const [profilesResult, disputesResult, transactionsResult, refundsResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name, created_at'),
      supabaseAdmin
        .from('disputes')
        .select('id, buyer_id, freelancer_id, status, created_at, buyer:buyer_id(full_name), freelancer:freelancer_id(full_name)'),
      supabaseAdmin
        .from('transactions')
        .select('id, order_id, buyer_id, amount_usd, status, created_at, buyer:buyer_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabaseAdmin
        .from('disputes')
        .select('id, buyer_id, freelancer_id, resolution_type, resolved_at, buyer:buyer_id(full_name), freelancer:freelancer_id(full_name)')
        .eq('resolution_type', 'buyer_favor'),
    ]);

    // ── Duplicate accounts: same email across multiple profiles ──
    const { data: authUsersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailToProfileIds = new Map<string, { id: string; email: string }[]>();
    (authUsersPage?.users ?? []).forEach((u) => {
      if (!u.email) return;
      const key = u.email.toLowerCase();
      const list = emailToProfileIds.get(key) ?? [];
      list.push({ id: u.id, email: u.email });
      emailToProfileIds.set(key, list);
    });
    const profileNameById = new Map((profilesResult.data ?? []).map((p) => [p.id, p.full_name]));
    const duplicateAccounts = Array.from(emailToProfileIds.entries())
      .filter(([, ids]) => ids.length > 1)
      .map(([email, ids]) => ({
        email,
        accounts: ids.map((entry) => ({ id: entry.id, fullName: profileNameById.get(entry.id) ?? null })),
      }));

    // ── Excessive disputes per user ──
    const disputeCountByUser = new Map<string, { count: number; name: string | null; role: 'buyer' | 'builder' }>();
    (disputesResult.data ?? []).forEach((d: any) => {
      const buyerEntry = disputeCountByUser.get(d.buyer_id) ?? { count: 0, name: d.buyer?.full_name ?? null, role: 'buyer' as const };
      buyerEntry.count += 1;
      disputeCountByUser.set(d.buyer_id, buyerEntry);

      const builderEntry = disputeCountByUser.get(d.freelancer_id) ?? { count: 0, name: d.freelancer?.full_name ?? null, role: 'builder' as const };
      builderEntry.count += 1;
      disputeCountByUser.set(d.freelancer_id, builderEntry);
    });
    const excessiveDisputes = Array.from(disputeCountByUser.entries())
      .filter(([, v]) => v.count >= EXCESSIVE_DISPUTE_THRESHOLD)
      .map(([id, v]) => ({ userId: id, ...v }))
      .sort((a, b) => b.count - a.count);

    // ── Suspicious payments: large amounts or repeated failures ──
    const suspiciousPayments = (transactionsResult.data ?? []).filter(
      (t: any) => Number(t.amount_usd) >= SUSPICIOUS_TRANSACTION_THRESHOLD_USD
    );
    const failedPayments = (transactionsResult.data ?? []).filter((t: any) => t.status === 'expired' || t.status === 'failed');

    // ── Excessive refunds per builder (buyer-favor resolutions hurt the builder) ──
    const refundCountByBuilder = new Map<string, { count: number; name: string | null }>();
    (refundsResult.data ?? []).forEach((d: any) => {
      const entry = refundCountByBuilder.get(d.freelancer_id) ?? { count: 0, name: d.freelancer?.full_name ?? null };
      entry.count += 1;
      refundCountByBuilder.set(d.freelancer_id, entry);
    });
    const excessiveRefunds = Array.from(refundCountByBuilder.entries())
      .filter(([, v]) => v.count >= EXCESSIVE_REFUND_THRESHOLD)
      .map(([id, v]) => ({ builderId: id, ...v }));

    return NextResponse.json({
      duplicateAccounts,
      excessiveDisputes,
      suspiciousPayments,
      failedPayments,
      excessiveRefunds,
      thresholds: {
        suspiciousTransactionUsd: SUSPICIOUS_TRANSACTION_THRESHOLD_USD,
        excessiveDisputeCount: EXCESSIVE_DISPUTE_THRESHOLD,
        excessiveRefundCount: EXCESSIVE_REFUND_THRESHOLD,
      },
    });
  } catch (error: unknown) {
    console.error('Founder fraud signals error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
