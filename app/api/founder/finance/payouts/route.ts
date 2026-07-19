import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/founder/server';
import {
  getFinancePayouts,
  getSearchParam,
  handleFinanceRouteError,
  parseDateRangeFromSearchParams,
  parsePaginationFromSearchParams,
  requireFinanceFounder,
} from '@/lib/finance/console';
import type { PayoutQueueFilters } from '@/lib/finance/read/shared/filters';

export async function GET(req: Request) {
  const auth = await requireFinanceFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const pagination = parsePaginationFromSearchParams(searchParams);
    const { from, to } = parseDateRangeFromSearchParams(searchParams);
    const status = getSearchParam(searchParams, 'status') as PayoutQueueFilters['status'] | undefined;

    const result = await getFinancePayouts(supabaseAdmin, {
      ...pagination,
      builder: getSearchParam(searchParams, 'builder'),
      country: getSearchParam(searchParams, 'country'),
      currency: getSearchParam(searchParams, 'currency'),
      status,
      search: getSearchParam(searchParams, 'search'),
      from,
      to,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleFinanceRouteError(error);
  }
}
