import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Lists captured, not-yet-refunded transactions tied to a collab's milestones so the
 * buyer (or founder, via the dispute panel) can pick which payment a refund request
 * should apply to.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: collab, error: collabError } = await supabaseAdmin
      .from('collabs')
      .select('id, buyer_id, builder_id')
      .eq('id', id)
      .maybeSingle();

    if (collabError) throw collabError;
    if (!collab || (collab.buyer_id !== user.id && collab.builder_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: milestones, error: milestoneError } = await supabaseAdmin
      .from('milestones')
      .select('id')
      .eq('collab_id', id);

    if (milestoneError) throw milestoneError;
    const milestoneIds = (milestones ?? []).map((m) => m.id);
    if (milestoneIds.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    const { data: transactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id, amount_usd, transaction_type, status, razorpay_payment_id, created_at')
      .in('item_id', milestoneIds)
      .eq('status', 'completed')
      .not('razorpay_payment_id', 'is', null)
      .order('created_at', { ascending: false });

    if (txError) throw txError;

    const txIds = (transactions ?? []).map((t) => t.id);
    let activeRefundTxIds = new Set<string>();
    if (txIds.length > 0) {
      const { data: activeRefunds } = await supabaseAdmin
        .from('refund_requests')
        .select('transaction_id')
        .in('transaction_id', txIds)
        .not('status', 'in', '(rejected,failed,cancelled)');
      activeRefundTxIds = new Set((activeRefunds ?? []).map((r) => r.transaction_id));
    }

    const eligible = (transactions ?? []).filter((t) => !activeRefundTxIds.has(t.id));

    return NextResponse.json({ transactions: eligible });
  } catch (error: unknown) {
    console.error('Refundable transactions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
