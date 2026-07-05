import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { ACTIVE_DISPUTE_STATUSES } from '@/lib/marketplace/status';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: collab, error: collabError } = await supabaseAdmin
      .from('collabs')
      .select('id, title, buyer_id, builder_id, status')
      .eq('id', id)
      .maybeSingle();

    if (collabError) throw collabError;
    if (!collab || collab.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can complete this project.' }, { status: 403 });
    }

    const [{ data: activeDispute, error: disputeError }, { data: milestones, error: milestonesError }] = await Promise.all([
      supabaseAdmin
        .from('disputes')
        .select('id')
        .eq('collab_id', id)
        .in('status', ACTIVE_DISPUTE_STATUSES as unknown as string[])
        .maybeSingle(),
      supabaseAdmin.from('milestones').select('id, status').eq('collab_id', id),
    ]);

    if (disputeError) throw disputeError;
    if (milestonesError) throw milestonesError;
    if (activeDispute) {
      return NextResponse.json({ error: 'Project completion is paused while a dispute is active.' }, { status: 409 });
    }

    if (!milestones?.length || milestones.some((milestone) => milestone.status !== 'released')) {
      return NextResponse.json(
        { error: 'All milestones must be accepted and released before project completion.' },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('collabs')
      .update({ status: 'completed', completion_percentage: 100 })
      .eq('id', id);

    if (updateError) throw updateError;

    void sendNotification({
      type: NotificationType.PROJECT_COMPLETED,
      recipientId: collab.builder_id,
      title: 'Project completed',
      message: `"${collab.title || 'Your project'}" has been marked complete. The buyer may leave a review separately.`,
      link: `/collab/${id}`,
      metadata: {
        collabId: id,
        projectName: collab.title || 'Your project',
        projectStatus: 'completed',
        actorId: user.id,
        idempotencyKey: `project-completed:${id}`,
      },
    });

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Project completion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
