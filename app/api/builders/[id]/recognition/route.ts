import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabase';
import { fetchCachedBuilderBadges, getPrimaryBadge } from '@/lib/arena';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();
    const badges = await fetchCachedBuilderBadges(supabaseAdmin, id);

    return NextResponse.json({
      builderId: id,
      badges,
      primaryBadge: getPrimaryBadge(badges),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load recognition badges';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
