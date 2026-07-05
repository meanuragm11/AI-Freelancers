import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import {
  fulfillRazorpayPayment,
  mapTransactionTypeToCheckout,
} from '@/lib/payments/fulfillRazorpayPayment';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const [{ data: pendingTransactions, error: pendingError }, { data: libraryRows, error: libraryError }] =
      await Promise.all([
        supabaseAdmin
          .from('transactions')
          .select('id, order_id, item_id, transaction_type, status, metadata, razorpay_payment_id')
          .eq('buyer_id', user.id)
          .eq('status', 'pending')
          .eq('transaction_type', 'component_purchase'),
        supabaseAdmin.from('library').select('component_id').eq('user_id', user.id),
      ]);

    if (pendingError) throw pendingError;
    if (libraryError) throw libraryError;

    const ownedComponentIds = new Set(
      (libraryRows ?? []).map((row) => row.component_id).filter(Boolean)
    );

    const { data: completedMissingLibrary, error: completedError } = await supabaseAdmin
      .from('transactions')
      .select('id, order_id, item_id, transaction_type, status, metadata, razorpay_payment_id')
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .eq('transaction_type', 'component_purchase');

    if (completedError) throw completedError;

    const transactionsToSync = [
      ...(pendingTransactions ?? []),
      ...(completedMissingLibrary ?? []).filter(
        (transaction) => transaction.item_id && !ownedComponentIds.has(transaction.item_id)
      ),
    ];

    let synced = 0;
    const errors: string[] = [];

    for (const transaction of transactionsToSync) {
      if (!transaction.order_id) continue;

      try {
        let paymentId = transaction.razorpay_payment_id ?? null;

        if (!paymentId) {
          const paymentsResponse = await razorpay.orders.fetchPayments(transaction.order_id);
          const capturedPayment = (paymentsResponse.items ?? []).find(
            (payment) => payment.status === 'captured'
          );
          paymentId = capturedPayment?.id ?? null;
        }

        if (!paymentId) continue;

        const checkoutType =
          mapTransactionTypeToCheckout(transaction.transaction_type) ??
          mapTransactionTypeToCheckout(
            (transaction.metadata as Record<string, unknown> | null)?.checkoutType as string | undefined
          );

        if (checkoutType !== 'asset' || !transaction.item_id) continue;

        await fulfillRazorpayPayment({
          checkoutType: 'asset',
          referenceId: transaction.item_id,
          userId: user.id,
          orderId: transaction.order_id,
          paymentId,
          transactionId: transaction.id,
          idempotencyBase: `sync:${paymentId}`,
        });

        synced += 1;
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'Sync failed';
        errors.push(message);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      checked: transactionsToSync.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sync purchases';
    console.error('Library sync error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
