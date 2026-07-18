import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { checkBuilderProposalLimits } from '@/lib/open-projects/limits';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createSupabaseServerClient();
    const limits = await checkBuilderProposalLimits(supabase, user.id);

    return NextResponse.json({ limits });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch limits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
