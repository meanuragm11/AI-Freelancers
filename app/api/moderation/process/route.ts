import { NextResponse } from 'next/server';
import {
  runChatModeration,
  runProjectModeration,
  runProposalModeration,
} from '@/lib/moderation';
import { supabaseAdmin } from '@/lib/founder/server';

/**
 * Internal endpoint for re-processing moderation jobs.
 * Protected by service role key header — never exposed to frontend.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      type: 'project' | 'proposal' | 'chat';
      id: string;
    };

    if (!body.type || !body.id) {
      return NextResponse.json({ error: 'type and id required' }, { status: 400 });
    }

    if (body.type === 'project') {
      const { data } = await supabaseAdmin
        .from('projects')
        .select('id, buyer_id, title, description, category, budget_min_usd, budget_max_usd')
        .eq('id', body.id)
        .maybeSingle();
      if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      await runProjectModeration({
        projectId: data.id,
        buyerId: data.buyer_id,
        title: data.title,
        description: data.description ?? '',
        category: data.category,
        budgetMin: data.budget_min_usd,
        budgetMax: data.budget_max_usd,
      });
    } else if (body.type === 'proposal') {
      const { data } = await supabaseAdmin
        .from('project_proposals')
        .select('id, builder_id, cover_letter, proposed_amount_usd, project:project_id(title)')
        .eq('id', body.id)
        .maybeSingle();
      if (!data) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      const project = data.project as { title?: string } | null;
      await runProposalModeration({
        proposalId: data.id,
        builderId: data.builder_id,
        coverLetter: data.cover_letter,
        proposedAmountUsd: data.proposed_amount_usd,
        projectTitle: project?.title,
      });
    } else if (body.type === 'chat') {
      const { data } = await supabaseAdmin
        .from('messages')
        .select('id, collab_id, sender_id, content')
        .eq('id', body.id)
        .maybeSingle();
      if (!data) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      await runChatModeration({
        messageId: data.id,
        collabId: data.collab_id,
        senderId: data.sender_id,
        content: data.content,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Moderation process error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
