import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { listSavedProjects } from '@/lib/open-projects/service';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createSupabaseServerClient();
    const saved = await listSavedProjects(supabase, user.id);
    return NextResponse.json({ saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch saved projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
