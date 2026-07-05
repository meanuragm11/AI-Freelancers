import { NextResponse } from 'next/server';
import { logAdminAction, requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { decideRefundRequest, RefundValidationError } from '@/lib/refunds/service';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      action?: 'approve' | 'reject' | 'retry';
      amountUsd?: number;
      note?: string;
    };
    const { action, amountUsd, note } = body;

    if (!action || !['approve', 'reject', 'retry'].includes(action)) {
      return NextResponse.json({ error: 'A valid action is required' }, { status: 400 });
    }

    const { data: before } = await supabaseAdmin
      .from('refund_requests')
      .select('status, requested_amount_usd')
      .eq('id', id)
      .maybeSingle();

    const updated = await decideRefundRequest({
      supabaseAdmin,
      refundId: id,
      decision: action === 'reject' ? 'reject' : action,
      reviewerId: auth.actor.id,
      amountUsd,
      note,
    });

    await logAdminAction({
      actor: auth.actor,
      action: `refund.${action}`,
      targetType: 'refund_request',
      targetId: id,
      metadata: { note: note?.trim() || null },
      previousValue: before ?? null,
      newValue: { status: updated.status, amountUsd: updated.founder_decision_amount_usd ?? null },
    });

    return NextResponse.json({ refund: updated });
  } catch (error: unknown) {
    if (error instanceof RefundValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Founder refund decision error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
