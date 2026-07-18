import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabase';
import { fetchBuildersRecognitionBatch } from '@/lib/arena/badges/engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids') ?? '';
    const builderIds = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 50);

    if (builderIds.length === 0) {
      return NextResponse.json({ badgesByBuilder: {} });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const badgesByBuilder = await fetchBuildersRecognitionBatch(supabaseAdmin, builderIds);

    return NextResponse.json({ badgesByBuilder });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load recognition badges';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
