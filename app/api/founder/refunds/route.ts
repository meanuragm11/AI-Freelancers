import { NextResponse } from 'next/server';
import { logAdminAction, requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { isUuid } from '@/lib/founder/utils';
import { createRefundRequest, RefundValidationError } from '@/lib/refunds/service';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const status = searchParams.get('status')?.trim();

    let query = supabaseAdmin
      .from('refund_requests')
      .select(
        `*, buyer:buyer_id(id, full_name), builder:builder_id(id, full_name),
         collab:collab_id(id, title), transaction:transaction_id(id, amount_usd, razorpay_payment_id, transaction_type)`
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);

    if (q) {
      if (isUuid(q)) {
        query = query.or(`id.eq.${q},collab_id.eq.${q},buyer_id.eq.${q},builder_id.eq.${q}`);
      } else {
        const { data: matchingProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .ilike('full_name', `%${q}%`)
          .limit(50);
        const ids = (matchingProfiles ?? []).map((p) => p.id);
        if (ids.length > 0) {
          query = query.or(`buyer_id.in.(${ids.join(',')}),builder_id.in.(${ids.join(',')})`);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ refunds: data ?? [] });
  } catch (error: unknown) {
    console.error('Founder refunds list error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type FounderCreateRefundBody = {
  collabId?: string;
  transactionId?: string;
  refundType?: 'full' | 'partial' | 'milestone' | 'custom_settlement';
  requestedAmountUsd?: number;
  reason?: string;
  disputeId?: string;
};

// Founder-initiated refund, typically filed while resolving a dispute in the
// buyer's favor. Skips the buyer/builder request steps but still requires a
// separate, explicit approval via PATCH before any money moves.
export async function POST(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as FounderCreateRefundBody;
    const { collabId, transactionId, refundType, requestedAmountUsd, reason, disputeId } = body;

    if (!collabId || !transactionId || !refundType || requestedAmountUsd === undefined || !reason) {
      return NextResponse.json(
        { error: 'collabId, transactionId, refundType, requestedAmountUsd, and reason are required' },
        { status: 400 }
      );
    }

    const refund = await createRefundRequest({
      supabaseAdmin,
      collabId,
      transactionId,
      refundType,
      requestedAmountUsd,
      reason,
      requestedBy: auth.actor.id,
      disputeId: disputeId ?? null,
      initialStatus: 'founder_review',
    });

    await logAdminAction({
      actor: auth.actor,
      action: 'refund.create',
      targetType: 'refund_request',
      targetId: refund.id,
      metadata: { collabId, transactionId, refundType, requestedAmountUsd, disputeId: disputeId ?? null },
    });

    return NextResponse.json({ refund });
  } catch (error: unknown) {
    if (error instanceof RefundValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Founder create refund error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
