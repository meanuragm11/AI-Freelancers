import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = (await req.json()) as { responseType?: 'accept' | 'contest'; response?: string };
    const { responseType, response } = body;

    if (!responseType || !['accept', 'contest'].includes(responseType)) {
      return NextResponse.json({ error: 'A valid responseType is required' }, { status: 400 });
    }

    // Uses the user's own session (not service role) so `respond_to_refund_request`
    // can enforce ownership itself via auth.uid().
    const supabase = await createSupabaseServerClient();
    const { data: refund, error } = await supabase.rpc('respond_to_refund_request', {
      p_refund_id: id,
      p_response_type: responseType,
      p_response: response?.trim() || null,
    });

    if (error) throw error;

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: collab } = await supabaseAdmin
      .from('collabs')
      .select('title')
      .eq('id', refund.collab_id)
      .maybeSingle();

    void sendNotification({
      type: NotificationType.REFUND_EVENT,
      recipientId: refund.buyer_id,
      title: 'Builder responded to your refund request',
      message: `The builder ${responseType === 'accept' ? 'accepted' : 'contested'} your refund request for "${collab?.title || 'your project'}". Our team will review it next.`,
      link: `/buyer/collabs/${refund.collab_id}`,
      metadata: { collabId: refund.collab_id, actorId: user.id },
    });

    return NextResponse.json({ refund });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to respond to refund request';
    const status = message.includes('Forbidden') ? 403 : message.includes('already been responded') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
