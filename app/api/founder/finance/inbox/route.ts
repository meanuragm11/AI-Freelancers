import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/founder/server';
import {
  getFinanceInbox,
  getSearchParam,
  handleFinanceRouteError,
  requireFinanceFounder,
} from '@/lib/finance/console';

export async function GET(req: Request) {
  const auth = await requireFinanceFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const search = getSearchParam(searchParams, 'search');
    const result = await getFinanceInbox(supabaseAdmin, search);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleFinanceRouteError(error);
  }
}
