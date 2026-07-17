import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { getProjectActivity, getProjectById } from '@/lib/open-projects/service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const project = await getProjectById(supabase, id);

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const events = await getProjectActivity(supabase, id, user.id);
    return NextResponse.json({ events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
