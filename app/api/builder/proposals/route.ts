import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { listBuilderProposals } from '@/lib/open-projects/service';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createSupabaseServerClient();
    const proposals = await listBuilderProposals(supabase, user.id);
    return NextResponse.json({ proposals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
