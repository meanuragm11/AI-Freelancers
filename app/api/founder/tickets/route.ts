import { NextResponse } from 'next/server';
import { requireFounder } from '@/lib/founder/server';
import { listFounderTickets } from '@/lib/support/listFounderTickets';
import {
  FOUNDER_TICKET_CATEGORIES,
  FOUNDER_TICKET_PRIORITIES,
  FOUNDER_TICKET_STATUSES,
} from '@/lib/support/founderConstants';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const userId = searchParams.get('userId');
    const q = searchParams.get('q')?.trim() || null;
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    if (status && !FOUNDER_TICKET_STATUSES.includes(status as (typeof FOUNDER_TICKET_STATUSES)[number])) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }
    if (priority && !FOUNDER_TICKET_PRIORITIES.includes(priority as (typeof FOUNDER_TICKET_PRIORITIES)[number])) {
      return NextResponse.json({ error: 'Invalid priority filter' }, { status: 400 });
    }
    if (category && !FOUNDER_TICKET_CATEGORIES.includes(category as (typeof FOUNDER_TICKET_CATEGORIES)[number])) {
      return NextResponse.json({ error: 'Invalid category filter' }, { status: 400 });
    }

    const result = await listFounderTickets({
      status,
      category,
      priority,
      userId,
      q,
      page,
      pageSize: 20,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Founder tickets list error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
