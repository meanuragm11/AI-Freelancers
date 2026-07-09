import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { updateProposalStatus } from '@/lib/open-projects/service';
import { getProjectById } from '@/lib/open-projects/service';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; proposalId: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, proposalId } = await params;
    const { status } = (await req.json()) as { status: string };

    const supabase = await createSupabaseServerClient();
    const project = await getProjectById(supabase, id);
    if (!project || project.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const proposal = await updateProposalStatus(supabase, proposalId, status, user.id);
    return NextResponse.json({ proposal });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update proposal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
