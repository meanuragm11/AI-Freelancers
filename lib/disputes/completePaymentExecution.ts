import type { SupabaseClient } from '@supabase/supabase-js';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import { logBusinessEvent } from '@/lib/events/businessEvents';
import { paymentExecutionClosesDispute } from '@/lib/disputes/transitions';
import { createFinanceIntegrationService } from '@/lib/finance/integration';

type CompletePaymentExecutionParams = {
  supabaseAdmin: SupabaseClient;
  disputeId: string;
  actorId?: string | null;
  success?: boolean;
};

/**
 * Called from the Payments module after escrow release/refund execution completes.
 * Marks payment execution and closes the dispute when appropriate.
 */
export async function completeDisputePaymentExecution({
  supabaseAdmin,
  disputeId,
  actorId = null,
  success = true,
}: CompletePaymentExecutionParams) {
  const { data: dispute, error } = await supabaseAdmin
    .from('disputes')
    .select('id, collab_id, buyer_id, freelancer_id, status, decision_type, collab:collab_id(title)')
    .eq('id', disputeId)
    .maybeSingle();

  if (error) throw error;
  if (!dispute) return null;

  const now = new Date().toISOString();
  const paymentStatus = success ? 'completed' : 'failed';
  const shouldClose =
    success &&
    (dispute.status === 'waiting_for_payment_execution' ||
      paymentExecutionClosesDispute(dispute.decision_type));

  const updates: Record<string, unknown> = {
    payment_execution_status: paymentStatus,
  };

  if (shouldClose) {
    updates.status = 'closed';
    updates.closed_at = now;
    updates.resolved_at = dispute.status !== 'closed' ? now : undefined;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('disputes')
    .update(updates)
    .eq('id', disputeId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  await supabaseAdmin.from('dispute_timeline_entries').insert({
    dispute_id: disputeId,
    collab_id: dispute.collab_id,
    actor_id: actorId,
    actor_role: actorId ? 'admin' : 'system',
    entry_type: success ? 'payment_executed' : 'payment_execution_failed',
    description: success
      ? 'Payment execution completed in Payments module.'
      : 'Payment execution failed in Payments module.',
    metadata: { payment_execution_status: paymentStatus },
  });

  if (shouldClose) {
    await supabaseAdmin
      .from('collabs')
      .update({ status: dispute.decision_type === 'cancelled' ? 'funded' : 'released' })
      .eq('id', dispute.collab_id);

    const projectTitle = (dispute.collab as { title?: string } | null)?.title || 'your project';

    await Promise.all(
      [dispute.buyer_id, dispute.freelancer_id].map((recipientId) =>
        sendNotification({
          type: NotificationType.DISPUTE_EVENT,
          recipientId,
          title: 'Dispute closed',
          message: `The dispute for "${projectTitle}" has been closed after payment execution.`,
          link: `/collab/${dispute.collab_id}`,
          metadata: {
            collabId: dispute.collab_id,
            projectName: projectTitle,
            idempotencyKey: `dispute:closed:${disputeId}:${recipientId}`,
          },
        }).catch((notifyError) => console.error('Failed to notify dispute closure:', notifyError))
      )
    );

    void logBusinessEvent({
      eventType: 'dispute.closed',
      entityType: 'dispute',
      entityId: disputeId,
      collabId: dispute.collab_id,
      actorId: actorId ?? undefined,
      summary: `Dispute closed after payment execution for "${projectTitle}"`,
    });

    const finance = createFinanceIntegrationService(supabaseAdmin);
    void finance.recordDisputeSettled({
      disputeId,
      collabId: dispute.collab_id,
      buyerId: dispute.buyer_id,
      builderId: dispute.freelancer_id,
      actorId,
      decisionType: dispute.decision_type ?? null,
    });
  } else if (success) {
    const projectTitle = (dispute.collab as { title?: string } | null)?.title || 'your project';
    await Promise.all(
      [dispute.buyer_id, dispute.freelancer_id].map((recipientId) =>
        sendNotification({
          type: NotificationType.DISPUTE_EVENT,
          recipientId,
          title: 'Dispute payment executed',
          message: `Payment for the dispute on "${projectTitle}" has been executed.`,
          link: `/collab/${dispute.collab_id}`,
          metadata: {
            collabId: dispute.collab_id,
            projectName: projectTitle,
            idempotencyKey: `dispute:payment_executed:${disputeId}:${recipientId}`,
          },
        }).catch((notifyError) => console.error('Failed to notify payment execution:', notifyError))
      )
    );
  }

  return updated;
}

/** Close dispute linked to a completed refund request when applicable. */
export async function maybeCompleteDisputeFromRefund(
  supabaseAdmin: SupabaseClient,
  refund: { dispute_id?: string | null; status: string },
  actorId?: string | null
) {
  if (!refund.dispute_id || refund.status !== 'completed') return null;
  return completeDisputePaymentExecution({
    supabaseAdmin,
    disputeId: refund.dispute_id,
    actorId,
    success: true,
  });
}
