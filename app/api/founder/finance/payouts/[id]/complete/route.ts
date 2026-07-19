import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/founder/server';
import {
  completeFinancePayout,
  isAlreadyCompletedError,
} from '@/lib/finance/console/completePayoutController';
import { handleFinanceRouteError, requireFinanceFounder } from '@/lib/finance/console';
import type { PayoutQueueSource } from '@/lib/finance/read/shared/dto/payouts';
import { FinanceValidationError } from '@/lib/finance/validators';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_SOURCES = new Set<PayoutQueueSource>(['finance_v2', 'withdrawal', 'invoice']);

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireFinanceFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      source?: PayoutQueueSource;
      transactionReference?: string;
      notes?: string;
      receiptUrl?: string;
    };

    if (!body.source || !VALID_SOURCES.has(body.source)) {
      return NextResponse.json(
        { error: 'source is required (finance_v2, withdrawal, or invoice)' },
        { status: 400 }
      );
    }

    const payout = await completeFinancePayout(supabaseAdmin, {
      payoutId: id,
      source: body.source,
      transactionReference: body.transactionReference ?? '',
      notes: body.notes ?? null,
      receiptUrl: body.receiptUrl ?? null,
      completedBy: auth.actor.id,
    });

    return NextResponse.json({ payout });
  } catch (error: unknown) {
    if (error instanceof FinanceValidationError) {
      const status = isAlreadyCompletedError(error) ? 409 : 400;
      return NextResponse.json({ error: error.message, field: error.field }, { status });
    }
    return handleFinanceRouteError(error);
  }
}
