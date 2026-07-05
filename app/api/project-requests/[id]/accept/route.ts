import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { assertProfileCan, ModerationBlockedError } from '@/lib/moderation/checks';

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

    // Verify the user is the builder
    if (request.builder_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await assertProfileCan(supabase, user.id, 'accept_work', 'Your account cannot accept new work at this time.');

    // Update request status to accepted
    const { error: updateError } = await supabase
      .from('project_requests')
      .update({
        status: 'accepted',
        agreed_amount_usd: request.budget_usd,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Update collab status to negotiating (waiting for payment)
    if (request.conversation_id) {
      await supabase
        .from('collabs')
        .update({ status: 'negotiating' })
        .eq('id', request.conversation_id);

      // Send notification to buyer
      await supabase.from('messages').insert({
        collab_id: request.conversation_id,
        sender_id: user.id,
        text: `[[PROPOSAL_ACCEPTED]] Builder has accepted your project request "${request.title}". Please proceed to payment.\n\nProject Price: $${request.budget_usd?.toLocaleString() || '—'}\nPlatform Fee: $5\nTotal: $${((request.budget_usd || 0) + 5).toLocaleString()}`,
        content: `[[PROPOSAL_ACCEPTED]] Builder has accepted your project request "${request.title}". Please proceed to payment.\n\nProject Price: $${request.budget_usd?.toLocaleString() || '—'}\nPlatform Fee: $5\nTotal: $${((request.budget_usd || 0) + 5).toLocaleString()}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof ModerationBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
