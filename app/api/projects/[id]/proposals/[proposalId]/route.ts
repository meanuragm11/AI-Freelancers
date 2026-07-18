import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { getProjectById, updateProposalStatus } from '@/lib/open-projects/service';
import {
  checkProposalEditEligibility,
  markProposalViewedByBuyer,
  updateProposalContent,
  withdrawProposal,
} from '@/lib/open-projects/proposalEdits';
import {
  checkWithdrawalLimits,
  incrementBuilderDailyCounter,
} from '@/lib/open-projects/limits';
import type { UpdateProposalContentInput } from '@/lib/open-projects/proposalEdits';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, proposalId } = await params;
    const supabase = await createSupabaseServerClient();
    const project = await getProjectById(supabase, id);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { data: proposal } = await supabase
      .from('project_proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('project_id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

    const isBuyer = project.buyer_id === user.id;
    const isBuilder = proposal.builder_id === user.id;
    if (!isBuyer && !isBuilder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isBuyer) {
      await markProposalViewedByBuyer(supabase, proposalId, user.id);
    }

    const editEligibility = isBuilder ? checkProposalEditEligibility(proposal) : null;

    return NextResponse.json({ proposal, editEligibility });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; proposalId: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, proposalId } = await params;
    const body = (await req.json()) as {
      action?: 'withdraw' | 'update_status';
      status?: string;
    } & UpdateProposalContentInput;

    const supabase = await createSupabaseServerClient();
    const project = await getProjectById(supabase, id);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { data: existing } = await supabase
      .from('project_proposals')
      .select('id, builder_id, status')
      .eq('id', proposalId)
      .eq('project_id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!existing) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

    if (body.action === 'withdraw') {
      if (existing.builder_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const withdrawalLimits = await checkWithdrawalLimits(supabase, user.id);
      if (!withdrawalLimits.canWithdraw) {
        return NextResponse.json({ error: withdrawalLimits.reason }, { status: 429 });
      }

      const proposal = await withdrawProposal(supabase, proposalId, user.id);
      await incrementBuilderDailyCounter(supabase, user.id, 'proposals_withdrawn');

      return NextResponse.json({ proposal, warning: withdrawalLimits.reason });
    }

    if (body.status && project.buyer_id === user.id) {
      const proposal = await updateProposalStatus(supabase, proposalId, body.status, user.id);
      return NextResponse.json({ proposal });
    }

    if (existing.builder_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const proposal = await updateProposalContent(supabase, proposalId, user.id, body);
    const editEligibility = checkProposalEditEligibility(proposal);

    return NextResponse.json({ proposal, editEligibility });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update proposal';
    const status = message.includes('limit') || message.includes('edits') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
