import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { restoreArchivedProject } from '@/lib/open-projects/activityMonitoring';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const result = await restoreArchivedProject(supabase, id, user.id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to restore project';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
