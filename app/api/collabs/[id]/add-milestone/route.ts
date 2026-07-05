import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const PLATFORM_FEE_THRESHOLD = 50;
const PLATFORM_FEE = 5;

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
    const { title, description, amount, deadline } = body;

    if (!title || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 });
    }

    // Get the collab
    const { data: collab, error: collabError } = await supabase
      .from('collabs')
      .select('*, buyer_id, builder_id')
      .eq('id', id)
      .single();

    if (collabError || !collab) {
      return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 });
    }

    // Verify the user is the buyer
    if (collab.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only buyers can add milestones' }, { status: 403 });
    }

    // Verify collab is active
    if (collab.status !== 'funded' && collab.status !== 'in_progress') {
      return NextResponse.json({ error: 'Can only add milestones to active projects' }, { status: 400 });
    }

    // Calculate cumulative new milestones total
    const currentNewMilestonesTotal = collab.new_milestones_total_usd || 0;
    const newCumulativeTotal = currentNewMilestonesTotal + amount;

    // Check if platform fee should be charged
    const shouldChargeFee = !collab.cumulative_new_milestones_fee_charged && newCumulativeTotal >= PLATFORM_FEE_THRESHOLD;
    const additionalFee = shouldChargeFee ? PLATFORM_FEE : 0;

    // Create milestone in draft status (needs builder approval)
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .insert({
        collab_id: id,
        title,
        description: description || '',
        amount_usd: amount,
        status: 'draft',
        due_date: deadline || null,
        is_new_milestone: true,
      })
      .select()
      .single();

    if (milestoneError) throw milestoneError;

    // Update collab with new milestone tracking
    await supabase
      .from('collabs')
      .update({
        new_milestones_total_usd: newCumulativeTotal,
        cumulative_new_milestones_fee_charged: shouldChargeFee ? true : collab.cumulative_new_milestones_fee_charged,
      })
      .eq('id', id);

    // Send notification to builder
    await supabase.from('messages').insert({
      collab_id: id,
      sender_id: user.id,
      text: `[[NEW_MILESTONE_PROPOSED]] Buyer has proposed a new milestone:\n\nTitle: ${title}\nAmount: $${amount.toLocaleString()}\n${deadline ? `Deadline: ${deadline}` : ''}\n\nPlease review and accept or reject this milestone.`,
      content: `[[NEW_MILESTONE_PROPOSED]] Buyer has proposed a new milestone:\n\nTitle: ${title}\nAmount: $${amount.toLocaleString()}\n${deadline ? `Deadline: ${deadline}` : ''}\n\nPlease review and accept or reject this milestone.`,
    });

    return NextResponse.json({ 
      success: true, 
      milestone,
      platformFee: additionalFee,
      cumulativeTotal: newCumulativeTotal,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
