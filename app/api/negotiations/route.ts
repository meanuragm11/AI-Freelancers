import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { project_request_id, proposed_amount_usd, explanation, proposal_type } = body;

    if (!project_request_id || !proposed_amount_usd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    // Get current negotiation round
    const { data: request } = await supabase
      .from('project_requests')
      .select('negotiation_round, conversation_id')
      .eq('id', project_request_id)
      .single();

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const newVersion = (request.negotiation_round || 0) + 1;

    // Create negotiation history record
    const { data: negotiation, error: negError } = await supabase
      .from('negotiation_history')
      .insert({
        project_request_id,
        proposed_by: user.id,
        proposal_type: proposal_type || 'counter_offer',
        proposed_amount_usd,
        explanation,
        status: 'pending',
        version: newVersion,
      })
      .select()
      .single();

    if (negError) throw negError;

    // Update project request
    const { error: updateError } = await supabase
      .from('project_requests')
      .update({
        status: 'negotiating',
        negotiation_round: newVersion,
        agreed_amount_usd: proposed_amount_usd,
      })
      .eq('id', project_request_id);

    if (updateError) throw updateError;

    // Send message notification
    if (request.conversation_id) {
      await supabase.from('messages').insert({
        collab_id: request.conversation_id,
        sender_id: user.id,
        text: `[[COUNTER_OFFER|${proposed_amount_usd}]] New proposal: $${proposed_amount_usd.toLocaleString()}${explanation ? `\n\nExplanation: ${explanation}` : ''}`,
        content: `[[COUNTER_OFFER|${proposed_amount_usd}]] New proposal: $${proposed_amount_usd.toLocaleString()}${explanation ? `\n\nExplanation: ${explanation}` : ''}`,
      });
    }

    return NextResponse.json({ success: true, negotiation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const project_request_id = searchParams.get('project_request_id');

    if (!project_request_id) {
      return NextResponse.json({ error: 'project_request_id is required' }, { status: 400 });
    }

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

    const { data: negotiations, error } = await supabase
      .from('negotiation_history')
      .select('*, proposer:profiles_public!proposed_by(full_name, avatar_url)')
      .eq('project_request_id', project_request_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ negotiations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
