import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { ACTIVE_DISPUTE_STATUSES } from '@/lib/marketplace/status';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { createFinanceIntegrationService } from '@/lib/finance/integration';

type RouteParams = { params: Promise<{ id: string }> };

type MilestoneAction = 'start_work' | 'submit' | 'request_revision' | 'accept';

type MilestonePayload = {
  action?: MilestoneAction;
  revisionReason?: string;
  deliverableTitle?: string;
  deliverableDescription?: string;
  attachments?: Array<{ name: string; url: string; type?: string; size?: number; path?: string; bucket?: string }>;
};

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = (await req.json()) as MilestonePayload;
    const supabaseAdmin = createSupabaseAdminClient();

    if (!body.action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const { data: milestone, error: milestoneError } = await supabaseAdmin
      .from('milestones')
      .select('id, collab_id, title, description, deliverables, amount_usd, status, collabs(id, title, buyer_id, builder_id, service_id, max_revisions, revisions_used, extra_revision_price_usd)')
      .eq('id', id)
      .maybeSingle();

    if (milestoneError) throw milestoneError;
    if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });

    const collab = milestone.collabs as unknown as {
      id: string;
      title?: string | null;
      buyer_id?: string | null;
      builder_id?: string | null;
      service_id?: string | null;
      max_revisions?: number | null;
      revisions_used?: number | null;
      extra_revision_price_usd?: number | null;
    } | null;

    if (!collab || (user.id !== collab.buyer_id && user.id !== collab.builder_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: activeDispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select('id')
      .eq('collab_id', milestone.collab_id)
      .in('status', ACTIVE_DISPUTE_STATUSES as unknown as string[])
      .maybeSingle();

    if (disputeError) throw disputeError;
    if (activeDispute) {
      return NextResponse.json({ error: 'Milestone actions are paused while a dispute is active.' }, { status: 409 });
    }

    const isBuyer = user.id === collab.buyer_id;
    const isBuilder = user.id === collab.builder_id;
    const currentStatus = String(milestone.status || '');

    if (body.action === 'start_work') {
      if (!isBuilder || currentStatus !== 'funded') {
        return NextResponse.json({ error: 'Only the builder can start a funded milestone.' }, { status: 403 });
      }

      const { error } = await supabaseAdmin.from('milestones').update({ status: 'in_progress' }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, status: 'in_progress' });
    }

    if (body.action === 'submit') {
      if (!isBuilder || currentStatus !== 'in_progress') {
        return NextResponse.json({ error: 'Only the builder can submit active work.' }, { status: 403 });
      }

      const nowIso = new Date().toISOString();
      const attachments = Array.isArray(body.attachments) ? body.attachments : [];
      const primaryAttachment = attachments[0];

      const { error: updateError } = await supabaseAdmin.from('milestones').update({ status: 'submitted' }).eq('id', id);
      if (updateError) throw updateError;

      await supabaseAdmin
        .from('revision_requests')
        .update({ status: 'resolved', resolved_at: nowIso })
        .eq('milestone_id', id)
        .eq('status', 'open');

      const { data: deliverable, error: deliverableError } = await supabaseAdmin
        .from('deliverables')
        .insert({
          collab_id: milestone.collab_id,
          milestone_id: id,
          submitted_by: user.id,
          title: body.deliverableTitle || milestone.title,
          description: body.deliverableDescription || milestone.deliverables || milestone.description || null,
          status: 'submitted',
          attachments,
          file_bucket: primaryAttachment?.bucket ?? (primaryAttachment ? 'marketplace-uploads' : null),
          file_path: primaryAttachment?.path ?? null,
          file_name: primaryAttachment?.name ?? null,
          file_type: primaryAttachment?.type ?? null,
          file_size: primaryAttachment?.size ?? null,
        })
        .select('id')
        .single();

      if (deliverableError) throw deliverableError;

      if (collab.buyer_id) {
        void sendNotification({
          type: NotificationType.MILESTONE_SUBMITTED,
          recipientId: collab.buyer_id,
          title: 'Deliverable ready for review',
          message: `"${milestone.title}" has been submitted for acceptance.`,
          link: `/collab/${milestone.collab_id}`,
          metadata: {
            collabId: milestone.collab_id,
            projectName: collab.title || 'Your project',
            milestoneId: id,
            deliverableId: deliverable.id,
            actorId: user.id,
            idempotencyKey: `milestone-submit:${id}:${deliverable.id}`,
          },
        });
      }

      return NextResponse.json({ success: true, status: 'submitted', deliverableId: deliverable.id });
    }

    if (body.action === 'request_revision') {
      if (!isBuyer || currentStatus !== 'submitted') {
        return NextResponse.json({ error: 'Only the buyer can request revisions on submitted work.' }, { status: 403 });
      }

      const reason = body.revisionReason?.trim();
      if (!reason) {
        return NextResponse.json({ error: 'Revision reason is required' }, { status: 400 });
      }

      const revisionsUsed = Number(collab.revisions_used ?? 0);
      const maxRevisions = collab.max_revisions;

      const resolveExtraRevisionPrice = async () => {
        let extraRevisionPriceUsd = Number(collab.extra_revision_price_usd ?? 0);
        if (extraRevisionPriceUsd <= 0 && collab.service_id) {
          const { data: service } = await supabaseAdmin
            .from('services')
            .select('extra_revision_price_usd')
            .eq('id', collab.service_id)
            .maybeSingle();
          extraRevisionPriceUsd = Number(service?.extra_revision_price_usd ?? 0);
        }
        return extraRevisionPriceUsd;
      };

      const revisionLimitResponse = async () => {
        const extraRevisionPriceUsd = await resolveExtraRevisionPrice();
        if (extraRevisionPriceUsd > 0) {
          return NextResponse.json(
            {
              error: `You have used all ${maxRevisions} included revision(s). Pay $${extraRevisionPriceUsd} for an additional revision.`,
              requiresPayment: true,
              extraRevisionPriceUsd,
              collabId: collab.id,
              revisionsUsed,
              maxRevisions,
            },
            { status: 402 }
          );
        }

        return NextResponse.json(
          {
            error: `You have used all ${maxRevisions} included revision(s). No additional revisions are available for this project.`,
            revisionsUsed,
            maxRevisions,
          },
          { status: 403 }
        );
      };

      if (maxRevisions != null) {
        const { data: incrementedCollab, error: incrementError } = await supabaseAdmin
          .from('collabs')
          .update({ revisions_used: revisionsUsed + 1 })
          .eq('id', collab.id)
          .lt('revisions_used', maxRevisions)
          .select('revisions_used')
          .maybeSingle();

        if (incrementError) throw incrementError;
        if (!incrementedCollab) {
          return revisionLimitResponse();
        }
      } else {
        const { error: incrementError } = await supabaseAdmin
          .from('collabs')
          .update({ revisions_used: revisionsUsed + 1 })
          .eq('id', collab.id);
        if (incrementError) throw incrementError;
      }

      const { data: deliverable } = await supabaseAdmin
        .from('deliverables')
        .select('id')
        .eq('milestone_id', id)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const [{ error: milestoneUpdateError }, { data: revision, error: revisionError }] = await Promise.all([
        supabaseAdmin.from('milestones').update({ status: 'in_progress' }).eq('id', id),
        supabaseAdmin
          .from('revision_requests')
          .insert({
            collab_id: milestone.collab_id,
            milestone_id: id,
            deliverable_id: deliverable?.id ?? null,
            requested_by: user.id,
            builder_id: collab.builder_id,
            reason,
          })
          .select('id')
          .single(),
      ]);

      if (milestoneUpdateError) throw milestoneUpdateError;
      if (revisionError) throw revisionError;

      if (deliverable?.id) {
        await supabaseAdmin
          .from('deliverables')
          .update({ status: 'revision_requested', revision_notes: reason })
          .eq('id', deliverable.id);
      }

      if (collab.builder_id) {
        void sendNotification({
          type: NotificationType.MILESTONE_SUBMITTED,
          recipientId: collab.builder_id,
          title: 'Revision requested',
          message: `The buyer requested changes on "${milestone.title}".`,
          link: `/collab/${milestone.collab_id}`,
          metadata: {
            collabId: milestone.collab_id,
            projectName: collab.title || 'Your project',
            milestoneId: id,
            revisionRequestId: revision.id,
            actorId: user.id,
            idempotencyKey: `milestone-revision:${id}:${revision.id}`,
          },
        });
      }

      return NextResponse.json({ success: true, status: 'in_progress', revisionRequestId: revision.id });
    }

    if (body.action === 'accept') {
      if (!isBuyer || currentStatus !== 'submitted') {
        return NextResponse.json({ error: 'Only the buyer can accept submitted work.' }, { status: 403 });
      }

      const { data: deliverable } = await supabaseAdmin
        .from('deliverables')
        .select('id')
        .eq('milestone_id', id)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nowIso = new Date().toISOString();
      const [{ error: milestoneUpdateError }, { error: deliverableUpdateError }] = await Promise.all([
        supabaseAdmin.from('milestones').update({ status: 'released' }).eq('id', id),
        deliverable?.id
          ? supabaseAdmin
              .from('deliverables')
              .update({ status: 'accepted', accepted_by: user.id, accepted_at: nowIso })
              .eq('id', deliverable.id)
          : Promise.resolve({ error: null }),
      ]);

      if (milestoneUpdateError) throw milestoneUpdateError;
      if (deliverableUpdateError) throw deliverableUpdateError;

      const finance = createFinanceIntegrationService(supabaseAdmin);
      const platformFeeUsd = 5;
      const grossAmountUsd = Number(milestone.amount_usd);

      const { data: paymentTxn } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('item_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      void finance.recordMilestoneApproved({
        buyerId: collab.buyer_id ?? null,
        builderId: collab.builder_id ?? null,
        collabId: milestone.collab_id,
        milestoneId: id,
        transactionId: paymentTxn?.id ?? null,
        amountUsd: grossAmountUsd,
        actorId: user.id,
      });

      const invoiceNumber = `ZEL-INV-${Date.now().toString().slice(-8)}`;
      const { data: invoice } = await supabaseAdmin
        .from('invoices')
        .insert({
          collab_id: milestone.collab_id,
          buyer_id: collab.buyer_id,
          builder_id: collab.builder_id,
          gross_amount_usd: milestone.amount_usd,
          platform_fee_usd: platformFeeUsd,
          net_payout_usd: Math.max(0, grossAmountUsd - platformFeeUsd),
          invoice_number: invoiceNumber,
          status: 'processing',
        })
        .select('id')
        .maybeSingle();

      if (invoice?.id) {
        void finance.recordInvoiceCreated({
          buyerId: collab.buyer_id ?? null,
          builderId: collab.builder_id ?? null,
          collabId: milestone.collab_id,
          milestoneId: id,
          invoiceId: invoice.id,
          invoiceNumber,
          grossAmountUsd,
          platformFeeUsd,
          actorId: user.id,
        });
      }

      if (collab.buyer_id && collab.builder_id) {
        void finance.recordEscrowReleased({
          collabId: milestone.collab_id,
          milestoneId: id,
          transactionId: paymentTxn?.id ?? null,
          buyerId: collab.buyer_id,
          builderId: collab.builder_id,
          grossAmountUsd,
          platformFeeUsd,
          currency: 'USD',
          actorId: user.id,
        });
      }

      if (collab.builder_id) {
        void sendNotification({
          type: NotificationType.MILESTONE_APPROVED,
          recipientId: collab.builder_id,
          title: 'Milestone approved',
          message: `Payment for "${milestone.title}" has been released.`,
          link: `/collab/${milestone.collab_id}`,
          metadata: {
            collabId: milestone.collab_id,
            projectName: collab.title || 'Your project',
            milestoneId: id,
            amount: milestone.amount_usd,
            actorId: user.id,
            idempotencyKey: `milestone-accept:${id}`,
          },
        });
      }

      return NextResponse.json({ success: true, status: 'released', invoiceNumber });
    }

    return NextResponse.json({ error: 'Unsupported milestone action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Milestone action failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
