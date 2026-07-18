import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { checkBuyerProjectLimits } from '@/lib/open-projects/limits';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const excludeProjectId = searchParams.get('excludeProjectId') ?? undefined;

    const supabase = await createSupabaseServerClient();
    const limits = await checkBuyerProjectLimits(supabase, user.id, excludeProjectId);

    return NextResponse.json({ limits });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch limits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
