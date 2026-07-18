import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { getProjectById } from '@/lib/open-projects/service';
import { createProjectRequestWithConversation } from '@/lib/project-requests';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId, proposalId } = await params;
    const supabase = await createSupabaseServerClient();
    const project = await getProjectById(supabase, projectId);

    if (!project || project.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: proposal } = await supabase
      .from('project_proposals')
      .select('id, builder_id')
      .eq('id', proposalId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const { data: existingCollab } = await supabase
      .from('collabs')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('builder_id', proposal.builder_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId = existingCollab?.id;
    if (!conversationId) {
      const created = await createProjectRequestWithConversation({
        buyer_id: user.id,
        builder_id: proposal.builder_id,
        title: `Re: ${project.title}`,
        description:
          project.description?.trim() ||
          `I'd like to discuss your proposal for "${project.title}".`,
        budget_usd: null,
        payment_type: 'single_payment',
      });
      conversationId = created.conversationId;
    }

    return NextResponse.json({
      conversationId,
      engagementNote:
        'Send at least two meaningful messages (20+ characters) or shortlist/negotiate/hire to count as project activity.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
