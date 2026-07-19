import { NextResponse } from 'next/server';
import {
  getFinanceSettings,
  handleFinanceRouteError,
  requireFinanceFounder,
} from '@/lib/finance/console';

export async function GET() {
  const auth = await requireFinanceFounder();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(getFinanceSettings());
  } catch (error: unknown) {
    return handleFinanceRouteError(error);
  }
}
