import type { SupabaseClient } from '@supabase/supabase-js';
import { getRazorpayClient } from '@/lib/payments/razorpayClient';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { logBusinessEvent } from '@/lib/events/businessEvents';

export type RefundType = 'full' | 'partial' | 'milestone' | 'custom_settlement';

export class RefundValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RefundValidationError';
    this.status = status;
  }
}

type CreateRefundRequestParams = {
  supabaseAdmin: SupabaseClient;
  collabId: string;
  transactionId: string;
  refundType: RefundType;
  requestedAmountUsd: number;
  reason: string;
  requestedBy: string;
  disputeId?: string | null;
  initialStatus?: 'requested' | 'founder_review';
};

/**
 * Shared validation + insert path for both the buyer self-service flow
 * (POST /api/refunds) and the founder-initiated flow (POST /api/founder/refunds,
 * typically triggered while resolving a dispute in the buyer's favor).
 */
export async function createRefundRequest({
  supabaseAdmin,
  collabId,
  transactionId,
  refundType,
  requestedAmountUsd,
  reason,
  requestedBy,
  disputeId = null,
  initialStatus = 'requested',
}: CreateRefundRequestParams) {
  if (!collabId || !transactionId || !refundType || !reason?.trim()) {
    throw new RefundValidationError('collabId, transactionId, refundType, and reason are required');
  }

  const amount = Number(requestedAmountUsd);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RefundValidationError('requestedAmountUsd must be a positive number');
  }

  const { data: collab, error: collabError } = await supabaseAdmin
    .from('collabs')
    .select('id, buyer_id, builder_id, title')
    .eq('id', collabId)
    .maybeSingle();

  if (collabError) throw collabError;
  if (!collab) throw new RefundValidationError('Project not found', 404);

  const { data: transaction, error: transactionError } = await supabaseAdmin
    .from('transactions')
    .select('id, buyer_id, amount_usd, status, razorpay_payment_id, transaction_type')
    .eq('id', transactionId)
    .maybeSingle();

  if (transactionError) throw transactionError;
  if (!transaction) throw new RefundValidationError('Transaction not found', 404);
  if (transaction.buyer_id !== collab.buyer_id) {
    throw new RefundValidationError('Transaction does not belong to this project', 400);
  }
  if (transaction.status !== 'completed' || !transaction.razorpay_payment_id) {
    throw new RefundValidationError('Only captured payments can be refunded', 409);
  }
  if (amount > Number(transaction.amount_usd) + 0.01) {
    throw new RefundValidationError(
      `Requested amount exceeds the captured payment ($${transaction.amount_usd})`,
      400
    );
  }

  const { data: existingActive, error: existingError } = await supabaseAdmin
    .from('refund_requests')
    .select('id, status')
    .eq('transaction_id', transactionId)
    .not('status', 'in', '(rejected,completed,failed,cancelled)')
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingActive) {
    throw new RefundValidationError('A refund request is already in progress for this payment', 409);
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('refund_requests')
    .insert({
      collab_id: collabId,
      transaction_id: transactionId,
      dispute_id: disputeId,
      buyer_id: collab.buyer_id,
      builder_id: collab.builder_id,
      requested_by: requestedBy,
      refund_type: refundType,
      requested_amount_usd: amount,
      reason: reason.trim(),
      status: initialStatus,
    })
    .select('*')
    .single();

  if (insertError) throw insertError;

  void logBusinessEvent({
    eventType: 'refund.requested',
    entityType: 'refund_request',
    entityId: inserted.id,
    collabId,
    actorId: requestedBy,
    amountUsd: amount,
    summary: `${refundType} refund requested for "${collab.title || 'a project'}"`,
    metadata: { transactionId, disputeId, refundType },
  });

  void sendNotification({
    type: NotificationType.REFUND_EVENT,
    recipientId: collab.builder_id,
    title: 'Refund requested',
    message: `A refund of $${amount.toFixed(2)} was requested for "${collab.title || 'your project'}".`,
    link: `/builder/inbox?conversation=${collabId}`,
    metadata: { collabId, projectName: collab.title, amount, actorId: requestedBy },
  });

  return inserted;
}

type DecideRefundRequestParams = {
  supabaseAdmin: SupabaseClient;
  refundId: string;
  decision: 'approve' | 'reject' | 'retry';
  reviewerId: string;
  amountUsd?: number;
  note?: string;
};

/** Founder decision on a refund request. Approval synchronously calls Razorpay. */
export async function decideRefundRequest({
  supabaseAdmin,
  refundId,
  decision,
  reviewerId,
  amountUsd,
  note,
}: DecideRefundRequestParams) {
  const { data: refund, error: refundError } = await supabaseAdmin
    .from('refund_requests')
    .select('*, transaction:transaction_id(id, amount_usd, razorpay_payment_id, status), collab:collab_id(title)')
    .eq('id', refundId)
    .maybeSingle();

  if (refundError) throw refundError;
  if (!refund) throw new RefundValidationError('Refund request not found', 404);

  const transaction = refund.transaction as { id: string; amount_usd: number; razorpay_payment_id: string | null } | null;

  if (decision === 'reject') {
    if (!['requested', 'builder_responded', 'founder_review'].includes(refund.status)) {
      throw new RefundValidationError(`Cannot reject a refund in status "${refund.status}"`, 409);
    }
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('refund_requests')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        founder_note: note?.trim() || null,
      })
      .eq('id', refundId)
      .select('*')
      .single();
    if (updateError) throw updateError;

    void logBusinessEvent({
      eventType: 'refund.rejected',
      entityType: 'refund_request',
      entityId: refundId,
      collabId: refund.collab_id,
      actorId: reviewerId,
      amountUsd: refund.requested_amount_usd,
      summary: `Refund rejected for "${(refund.collab as { title?: string } | null)?.title || 'a project'}"`,
      metadata: { note: note?.trim() || null },
    });

    void sendNotification({
      type: NotificationType.REFUND_EVENT,
      recipientId: refund.buyer_id,
      title: 'Refund request rejected',
      message: `Your refund request for "${(refund.collab as { title?: string } | null)?.title || 'your project'}" was rejected.${note ? ` ${note}` : ''}`,
      link: `/buyer/collabs/${refund.collab_id}`,
      metadata: { collabId: refund.collab_id, actorId: reviewerId },
    });

    return updated;
  }

  if (decision === 'approve' || decision === 'retry') {
    if (decision === 'approve' && !['requested', 'builder_responded', 'founder_review'].includes(refund.status)) {
      throw new RefundValidationError(`Cannot approve a refund in status "${refund.status}"`, 409);
    }
    if (decision === 'retry' && refund.status !== 'failed') {
      throw new RefundValidationError('Only failed refunds can be retried', 409);
    }

    if (!transaction?.razorpay_payment_id) {
      throw new RefundValidationError('The underlying payment has no Razorpay payment id on record', 409);
    }

    const finalAmount = Number(amountUsd ?? refund.founder_decision_amount_usd ?? refund.requested_amount_usd);
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      throw new RefundValidationError('A valid refund amount is required', 400);
    }
    if (finalAmount > Number(transaction.amount_usd) + 0.01) {
      throw new RefundValidationError(
        `Refund amount exceeds the captured payment ($${transaction.amount_usd})`,
        400
      );
    }

    await supabaseAdmin
      .from('refund_requests')
      .update({
        status: 'processing',
        founder_decision_amount_usd: finalAmount,
        founder_note: note?.trim() || refund.founder_note || null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq('id', refundId);

    try {
      const razorpay = getRazorpayClient();
      const razorpayRefund = await razorpay.payments.refund(transaction.razorpay_payment_id, {
        amount: Math.round(finalAmount * 100),
        speed: 'normal',
        notes: { refund_request_id: refundId, collab_id: refund.collab_id },
      });

      const finalStatus = razorpayRefund.status === 'failed' ? 'failed' : 'completed';

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('refund_requests')
        .update({
          status: finalStatus,
          razorpay_refund_id: razorpayRefund.id,
          processed_at: new Date().toISOString(),
          failure_reason: finalStatus === 'failed' ? 'Razorpay reported the refund as failed' : null,
        })
        .eq('id', refundId)
        .select('*')
        .single();
      if (updateError) throw updateError;

      if (finalStatus === 'completed' && transaction.id) {
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'refunded' })
          .eq('id', transaction.id);
      }

      void logBusinessEvent({
        eventType: finalStatus === 'completed' ? 'refund.completed' : 'refund.failed',
        entityType: 'refund_request',
        entityId: refundId,
        collabId: refund.collab_id,
        actorId: reviewerId,
        amountUsd: finalAmount,
        summary: `Refund ${finalStatus} for "${(refund.collab as { title?: string } | null)?.title || 'a project'}"`,
        metadata: { razorpayRefundId: razorpayRefund.id },
      });

      void sendNotification({
        type: NotificationType.REFUND_EVENT,
        recipientId: refund.buyer_id,
        title: finalStatus === 'completed' ? 'Refund approved' : 'Refund failed',
        message:
          finalStatus === 'completed'
            ? `Your refund of $${finalAmount.toFixed(2)} for "${(refund.collab as { title?: string } | null)?.title || 'your project'}" has been processed.`
            : `Your refund for "${(refund.collab as { title?: string } | null)?.title || 'your project'}" could not be processed. Our team has been notified.`,
        link: `/buyer/collabs/${refund.collab_id}`,
        metadata: { collabId: refund.collab_id, amount: finalAmount, actorId: reviewerId },
      });

      return updated;
    } catch (razorpayError: unknown) {
      const failureMessage =
        razorpayError instanceof Error ? razorpayError.message : 'Razorpay refund call failed';

      const { data: updated } = await supabaseAdmin
        .from('refund_requests')
        .update({ status: 'failed', failure_reason: failureMessage })
        .eq('id', refundId)
        .select('*')
        .single();

      void logBusinessEvent({
        eventType: 'refund.failed',
        entityType: 'refund_request',
        entityId: refundId,
        collabId: refund.collab_id,
        actorId: reviewerId,
        summary: `Refund attempt failed for "${(refund.collab as { title?: string } | null)?.title || 'a project'}"`,
        metadata: { failureReason: failureMessage },
      });

      return updated ?? { ...refund, status: 'failed', failure_reason: failureMessage };
    }
  }

  throw new RefundValidationError('Unsupported decision');
}
