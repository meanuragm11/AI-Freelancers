import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { reopenProject } from '@/lib/open-projects/service';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const project = await reopenProject(supabase, id, user.id);
    return NextResponse.json({ project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reopen project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
