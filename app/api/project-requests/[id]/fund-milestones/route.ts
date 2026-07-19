import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const PLATFORM_FEE = 5;

// TODO(FINANCE_PHASE_1): Remove legacy direct-fund path — require per-milestone Razorpay escrow checkout.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { milestones } = body;

    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
      return NextResponse.json({ error: 'Milestones are required' }, { status: 400 });
    }

    // Get the project request
    const { data: request, error: requestError } = await supabase
      .from('project_requests')
      .select('*, conversation_id')
      .eq('id', id)
      .single();

    if (requestError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Verify the user is the buyer
    if (request.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify request is accepted
    if (request.status !== 'accepted') {
      return NextResponse.json({ error: 'Request must be accepted before funding' }, { status: 400 });
    }

    const totalMilestoneAmount = milestones.reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
    const totalAmount = totalMilestoneAmount + PLATFORM_FEE;

    // Update collab with escrow amount
    if (request.conversation_id) {
      await supabase
        .from('collabs')
        .update({
          status: 'funded',
          escrow_amount_usd: totalMilestoneAmount,
          fixed_price_usd: totalMilestoneAmount,
        })
        .eq('id', request.conversation_id);

      // Create milestones from the agreed proposal
      for (const milestone of milestones) {
        await supabase.from('milestones').insert({
          collab_id: request.conversation_id,
          title: milestone.title,
          description: milestone.description,
          amount_usd: milestone.amount,
          status: 'funded',
          due_date: milestone.deadline,
        });
      }

      // Send notification to builder
      await supabase.from('messages').insert({
        collab_id: request.conversation_id,
        sender_id: user.id,
        text: `[[ESCROW_FUNDED]] Buyer has funded the milestone escrow. Total: $${totalAmount.toLocaleString()}\n\nMilestone Budget: $${totalMilestoneAmount.toLocaleString()}\nPlatform Fee: $${PLATFORM_FEE}\n\nMilestones: ${milestones.length}\n\nWorkspace is now active!`,
        content: `[[ESCROW_FUNDED]] Buyer has funded the milestone escrow. Total: $${totalAmount.toLocaleString()}\n\nMilestone Budget: $${totalMilestoneAmount.toLocaleString()}\nPlatform Fee: $${PLATFORM_FEE}\n\nMilestones: ${milestones.length}\n\nWorkspace is now active!`,
      });

      // Update request status
      await supabase
        .from('project_requests')
        .update({ status: 'funded' })
        .eq('id', id);
    }

    return NextResponse.json({ 
      success: true, 
      totalAmount,
      platformFee: PLATFORM_FEE,
      milestoneAmount: totalMilestoneAmount,
      milestonesCount: milestones.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
