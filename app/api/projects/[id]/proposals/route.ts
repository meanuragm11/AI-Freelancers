import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from '@/lib/server/rateLimit';
import {
  createProposal,
  getProjectById,
  listProjectProposals,
} from '@/lib/open-projects/service';
import { canSubmitProposal } from '@/lib/open-projects/permissions';
import { assertProfileCan, ModerationBlockedError } from '@/lib/moderation/checks';
import type { CreateProposalInput } from '@/lib/open-projects/types';

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

    const proposals = await listProjectProposals(supabase, id);
    return NextResponse.json({ proposals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = checkRateLimit(`proposals-create:${user.id}`, 20, 3600000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    await assertProfileCan(supabase, user.id, 'accept_work', 'Your account cannot submit proposals.');

    const project = await getProjectById(supabase, id);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const permission = await canSubmitProposal(supabase, project, user.id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const body = (await req.json()) as Omit<CreateProposalInput, 'project_id'>;
    if (!body.cover_letter?.trim() || !body.proposed_amount_usd) {
      return NextResponse.json({ error: 'Cover letter and amount are required' }, { status: 400 });
    }

    const proposal = await createProposal(supabase, user.id, {
      ...body,
      project_id: id,
      status: body.status ?? 'submitted',
    });

    return NextResponse.json({ proposal }, { status: 201, headers: rateLimitHeaders(limit) });
  } catch (error: unknown) {
    if (error instanceof ModerationBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Failed to submit proposal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
