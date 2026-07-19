import { NextResponse } from 'next/server';
import { FINANCE_DASHBOARD_ENABLED } from '@/lib/finance/constants';
import { requireFounder, type FounderAuthResult } from '@/lib/founder/server';

export function financeDashboardDisabledResponse(): NextResponse {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function requireFinanceFounder(): Promise<FounderAuthResult> {
  if (!FINANCE_DASHBOARD_ENABLED) {
    return { ok: false, response: financeDashboardDisabledResponse() };
  }
  return requireFounder();
}

export function handleFinanceRouteError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Internal server error';
  return NextResponse.json({ error: message }, { status: 500 });
}
