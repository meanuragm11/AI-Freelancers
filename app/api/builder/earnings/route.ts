import { NextResponse } from 'next/server';
import { computeBuilderEarningsLedger } from '@/lib/builder/earningsLedger';
import { requireBuilderAccount } from '@/lib/server/builderAuth';

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Failed to load earnings ledger';
}

export async function GET() {
  try {
    const auth = await requireBuilderAccount();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ledger = await computeBuilderEarningsLedger(auth.supabaseAdmin, auth.user.id);
    return NextResponse.json(ledger);
  } catch (error: unknown) {
    console.error('Earnings ledger error:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
