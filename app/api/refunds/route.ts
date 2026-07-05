import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { createRefundRequest, RefundValidationError } from '@/lib/refunds/service';

type CreateRefundBody = {
  collabId?: string;
  transactionId?: string;
  refundType?: 'full' | 'partial' | 'milestone' | 'custom_settlement';
  requestedAmountUsd?: number;
  reason?: string;
};

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createSupabaseAdminClient();
    const { searchParams } = new URL(req.url);
    const collabId = searchParams.get('collabId');

    let query = supabaseAdmin
      .from('refund_requests')
      .select('*, transaction:transaction_id(id, amount_usd, transaction_type)')
      .or(`buyer_id.eq.${user.id},builder_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (collabId) query = query.eq('collab_id', collabId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ refunds: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load refund requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as CreateRefundBody;
    const { collabId, transactionId, refundType, requestedAmountUsd, reason } = body;

    if (!collabId || !transactionId || !refundType || requestedAmountUsd === undefined || !reason) {
      return NextResponse.json(
        { error: 'collabId, transactionId, refundType, requestedAmountUsd, and reason are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('buyer_id')
      .eq('id', transactionId)
      .maybeSingle();

    if (transactionError) throw transactionError;
    if (!transaction || transaction.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const refund = await createRefundRequest({
      supabaseAdmin,
      collabId,
      transactionId,
      refundType,
      requestedAmountUsd,
      reason,
      requestedBy: user.id,
    });

    return NextResponse.json({ refund });
  } catch (error: unknown) {
    if (error instanceof RefundValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Create refund request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create refund request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
