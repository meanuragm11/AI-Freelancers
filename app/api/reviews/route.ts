import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { ACTIVE_DISPUTE_STATUSES } from '@/lib/marketplace/status';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';

type ReviewPayload = {
  collabId?: string;
  builderId?: string;
  serviceId?: string | null;
  rating?: number;
  review?: string;
};

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as ReviewPayload;
    const rating = Number(body.rating);
    if (!body.collabId || !body.builderId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'A completed project and 1-5 rating are required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const [{ data: collab, error: collabError }, { data: activeDispute, error: disputeError }] = await Promise.all([
      supabaseAdmin
        .from('collabs')
        .select('id, title, buyer_id, builder_id, service_id, status')
        .eq('id', body.collabId)
        .maybeSingle(),
      supabaseAdmin
        .from('disputes')
        .select('id')
        .eq('collab_id', body.collabId)
        .in('status', ACTIVE_DISPUTE_STATUSES as unknown as string[])
        .maybeSingle(),
    ]);

    if (collabError) throw collabError;
    if (disputeError) throw disputeError;
    if (!collab || collab.buyer_id !== user.id || collab.builder_id !== body.builderId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (activeDispute) {
      return NextResponse.json({ error: 'Reviews are paused while a dispute is active.' }, { status: 409 });
    }
    if (collab.status !== 'completed' && collab.status !== 'released') {
      return NextResponse.json({ error: 'Complete the project before leaving a review.' }, { status: 409 });
    }

    const { data: existingReview, error: existingReviewError } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('collab_id', body.collabId)
      .eq('buyer_id', user.id)
      .maybeSingle();

    if (existingReviewError) throw existingReviewError;
    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this project.' }, { status: 409 });
    }

    const serviceId = body.serviceId || collab.service_id || null;
    const feedback = body.review?.trim() || '';

    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        builder_id: body.builderId,
        buyer_id: user.id,
        collab_id: body.collabId,
        service_id: serviceId,
        rating,
        review: feedback,
      })
      .select('id')
      .single();

    if (reviewError) throw reviewError;

    const { data: builderReviews } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('builder_id', body.builderId);

    const builderReviewCount = builderReviews?.length ?? 0;
    const builderAverageRating = builderReviewCount
      ? builderReviews!.reduce((sum, row) => sum + Number(row.rating || 0), 0) / builderReviewCount
      : 0;

    const { count: completedProjects } = await supabaseAdmin
      .from('collabs')
      .select('id', { count: 'exact', head: true })
      .eq('builder_id', body.builderId)
      .in('status', ['completed', 'released']);

    await supabaseAdmin
      .from('profiles')
      .update({
        average_rating: Number(builderAverageRating.toFixed(2)),
        review_count: builderReviewCount,
        completed_projects: completedProjects ?? 0,
      })
      .eq('id', body.builderId);

    if (serviceId) {
      const { data: serviceReviews } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('service_id', serviceId);

      const serviceReviewCount = serviceReviews?.length ?? 0;
      const serviceAverageRating = serviceReviewCount
        ? serviceReviews!.reduce((sum, row) => sum + Number(row.rating || 0), 0) / serviceReviewCount
        : 0;

      const { count: serviceOrderCount } = await supabaseAdmin
        .from('collabs')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', serviceId)
        .in('status', ['completed', 'released']);

      await supabaseAdmin
        .from('services')
        .update({
          rating_avg: Number(serviceAverageRating.toFixed(2)),
          review_count: serviceReviewCount,
          order_count: serviceOrderCount ?? 0,
        })
        .eq('id', serviceId);
    }

    void sendNotification({
      type: NotificationType.REVIEW_RECEIVED,
      recipientId: body.builderId,
      title: 'New review received',
      message: feedback
        ? `You received a ${rating}-star review: "${feedback.slice(0, 160)}"`
        : `You received a ${rating}-star review on your completed project.`,
      link: `/profile/${body.builderId}`,
      metadata: {
        collabId: body.collabId,
        projectName: collab.title || 'Completed project',
        rating,
        serviceId: serviceId || undefined,
        actorId: user.id,
        idempotencyKey: `review:${body.collabId}:${user.id}`,
      },
    });

    return NextResponse.json({ success: true, reviewId: review.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Review submission failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
