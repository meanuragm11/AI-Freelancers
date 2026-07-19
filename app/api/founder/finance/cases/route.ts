import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/founder/server';
import {
  getFinanceCases,
  getSearchParam,
  handleFinanceRouteError,
  parseDateRangeFromSearchParams,
  parsePaginationFromSearchParams,
  requireFinanceFounder,
  type CasesTypeFilter,
  type ConsolePriority,
} from '@/lib/finance/console';

export async function GET(req: Request) {
  const auth = await requireFinanceFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const pagination = parsePaginationFromSearchParams(searchParams);
    const { from, to } = parseDateRangeFromSearchParams(searchParams);
    const type = (getSearchParam(searchParams, 'type') ?? 'all') as CasesTypeFilter;
    const priority = getSearchParam(searchParams, 'priority') as ConsolePriority | undefined;

    const result = await getFinanceCases(supabaseAdmin, {
      ...pagination,
      type,
      status: getSearchParam(searchParams, 'status'),
      priority,
      search: getSearchParam(searchParams, 'search'),
      from,
      to,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleFinanceRouteError(error);
  }
}
