import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { hireFromProposal } from '@/lib/open-projects/hireFromProposal';
import { canHireProposal } from '@/lib/open-projects/permissions';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    const { proposalId } = (await req.json()) as { proposalId: string };

    if (!proposalId) {
      return NextResponse.json({ error: 'proposalId is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: project } = await admin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project || !canHireProposal(project, user.id)) {
      return NextResponse.json({ error: 'Cannot hire for this project' }, { status: 403 });
    }

    const result = await hireFromProposal(admin, {
      projectId,
      proposalId,
      buyerId: user.id,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to hire builder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
