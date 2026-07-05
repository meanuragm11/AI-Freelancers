import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { getProposalCardPayload } from '@/lib/project-proposals/service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();
    const payload = await getProposalCardPayload(supabaseAdmin, id, user.id);
    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load proposal';
    const status = message === 'Forbidden' ? 403 : message === 'Proposal not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
