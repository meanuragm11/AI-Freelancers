import { NextResponse } from 'next/server';

import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';

import { PLATFORM_FEE_USD } from '@/lib/project-proposals/types';

import { syncAcceptedProposalMilestones } from '@/lib/milestones/syncProposalMilestones';



export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {

  try {

    const user = await getAuthenticatedUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });



    const { id } = await params;

    const supabaseAdmin = createSupabaseAdminClient();



    const { data: request, error } = await supabaseAdmin

      .from('project_requests')

      .select('*')

      .eq('id', id)

      .single();



    if (error || !request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    if (request.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (request.status !== 'accepted') {

      return NextResponse.json({ error: 'Proposal must be accepted before payment' }, { status: 400 });

    }



    if (!request.conversation_id) {

      return NextResponse.json({ error: 'Missing conversation' }, { status: 400 });

    }



    await syncAcceptedProposalMilestones(supabaseAdmin, request.conversation_id);



    const amount = Number(request.agreed_amount_usd ?? request.budget_usd ?? 0);



    const { data: draftMilestones, error: milestonesError } = await supabaseAdmin

      .from('milestones')

      .select('id, amount_usd, status, order_index')

      .eq('collab_id', request.conversation_id)

      .in('status', ['draft'])

      .order('order_index', { ascending: true })

      .order('created_at', { ascending: true });



    if (milestonesError) throw milestonesError;



    const firstDraft = draftMilestones?.[0];

    if (!firstDraft?.id) {

      return NextResponse.json({ error: 'No fundable milestone found for this project' }, { status: 400 });

    }



    await supabaseAdmin

      .from('collabs')

      .update({

        escrow_amount_usd: amount,

        fixed_price_usd: amount,

        payment_type:

          request.payment_type === 'milestone_payment' ? 'milestone_based' : 'single_payment',

      })

      .eq('id', request.conversation_id);



    const checkoutAmount = Number(firstDraft.amount_usd ?? amount);



    return NextResponse.json({

      checkoutUrl: `/checkout/escrow/${firstDraft.id}`,

      milestoneId: firstDraft.id,

      totalAmount: checkoutAmount + PLATFORM_FEE_USD,

    });

  } catch (error: unknown) {

    const message = error instanceof Error ? error.message : 'Failed to prepare checkout';

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

