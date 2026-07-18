import { NextResponse } from 'next/server';
import { requireFounder } from '@/lib/founder/server';
import { createSupabaseAdminClient } from '@/lib/server/supabase';
import { restoreArchivedProject } from '@/lib/open-projects/activityMonitoring';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const result = await restoreArchivedProject(admin, id, auth.actor.id, { asFounder: true });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to restore project';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
