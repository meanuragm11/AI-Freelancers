import { NextResponse } from 'next/server';
import { requireFounder } from '@/lib/founder/server';
import { listFounderDisputes } from '@/lib/disputes/listFounderDisputes';
import {
  DISPUTE_DECISION_TYPES,
  DISPUTE_PRIORITIES,
  FOUNDER_DISPUTE_STATUS_FILTERS,
} from '@/lib/disputes/constants';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const decision = searchParams.get('decision');
    const q = searchParams.get('q')?.trim() || null;
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    if (
      status &&
      !FOUNDER_DISPUTE_STATUS_FILTERS.includes(status as (typeof FOUNDER_DISPUTE_STATUS_FILTERS)[number])
    ) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }
    if (priority && !DISPUTE_PRIORITIES.includes(priority as (typeof DISPUTE_PRIORITIES)[number])) {
      return NextResponse.json({ error: 'Invalid priority filter' }, { status: 400 });
    }
    if (decision && !DISPUTE_DECISION_TYPES.includes(decision as (typeof DISPUTE_DECISION_TYPES)[number])) {
      return NextResponse.json({ error: 'Invalid decision filter' }, { status: 400 });
    }

    const result = await listFounderDisputes({
      status,
      priority,
      decision,
      q,
      page,
      pageSize: 20,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Founder disputes list error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
