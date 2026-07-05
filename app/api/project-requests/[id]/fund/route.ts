import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const agreedAmount = request.agreed_amount_usd || request.budget_usd || 0;
    const totalAmount = agreedAmount + PLATFORM_FEE;

    // Update collab with escrow amount
    if (request.conversation_id) {
      await supabase
        .from('collabs')
        .update({
          status: 'funded',
          escrow_amount_usd: agreedAmount,
          fixed_price_usd: agreedAmount,
        })
        .eq('id', request.conversation_id);

      // Create initial milestone for single payment
      await supabase.from('milestones').insert({
        collab_id: request.conversation_id,
        title: 'Project Completion',
        description: 'Complete the entire project as agreed',
        amount_usd: agreedAmount,
        status: 'funded',
        due_date: request.expected_deadline,
      });

      // Send notification to builder
      await supabase.from('messages').insert({
        collab_id: request.conversation_id,
        sender_id: user.id,
        text: `[[ESCROW_FUNDED]] Buyer has funded the escrow. Total: $${totalAmount.toLocaleString()}\n\nProject Amount: $${agreedAmount.toLocaleString()}\nPlatform Fee: $${PLATFORM_FEE}\n\nWorkspace is now active!`,
        content: `[[ESCROW_FUNDED]] Buyer has funded the escrow. Total: $${totalAmount.toLocaleString()}\n\nProject Amount: $${agreedAmount.toLocaleString()}\nPlatform Fee: $${PLATFORM_FEE}\n\nWorkspace is now active!`,
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
      projectAmount: agreedAmount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
