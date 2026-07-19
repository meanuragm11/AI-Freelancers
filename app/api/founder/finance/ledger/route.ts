import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/founder/server';
import {
  getFinanceLedger,
  getSearchParam,
  handleFinanceRouteError,
  parseDateRangeFromSearchParams,
  parsePaginationFromSearchParams,
  requireFinanceFounder,
} from '@/lib/finance/console';
import type { SortDirection } from '@/lib/finance/read/shared/pagination';

export async function GET(req: Request) {
  const auth = await requireFinanceFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const pagination = parsePaginationFromSearchParams(searchParams);
    const { from, to } = parseDateRangeFromSearchParams(searchParams);
    const sortDir = getSearchParam(searchParams, 'sortDir') as SortDirection | undefined;

    const result = await getFinanceLedger(supabaseAdmin, {
      ...pagination,
      builder: getSearchParam(searchParams, 'builder'),
      buyer: getSearchParam(searchParams, 'buyer'),
      invoice: getSearchParam(searchParams, 'invoice'),
      project: getSearchParam(searchParams, 'project'),
      collab: getSearchParam(searchParams, 'collab'),
      transaction: getSearchParam(searchParams, 'transaction'),
      ledgerId: getSearchParam(searchParams, 'ledgerId'),
      date: getSearchParam(searchParams, 'date'),
      from,
      to,
      entryType: getSearchParam(searchParams, 'entryType'),
      direction: getSearchParam(searchParams, 'direction'),
      currency: getSearchParam(searchParams, 'currency'),
      search: getSearchParam(searchParams, 'search'),
      directionParam: sortDir ?? pagination.direction,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleFinanceRouteError(error);
  }
}
