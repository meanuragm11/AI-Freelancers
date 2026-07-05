import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: expiredTransactions, error: expiredError } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'expired' })
      .eq('buyer_id', user.id)
      .eq('status', 'pending')
      .lt('payment_expires_at', now)
      .select('id, item_id, transaction_type');

    if (expiredError) throw expiredError;

    const expiredMilestoneIds = (expiredTransactions ?? [])
      .filter((tx) => tx.transaction_type === 'collab_milestone' && tx.item_id)
      .map((tx) => tx.item_id);

    if (expiredMilestoneIds.length > 0) {
      await supabaseAdmin
        .from('milestones')
        .update({ status: 'draft' })
        .in('id', expiredMilestoneIds)
        .eq('status', 'pending_funding');
    }

    const staleSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('collabs')
      .update({ status: 'expired' })
      .eq('buyer_id', user.id)
      .eq('status', 'pending_funding')
      .lt('created_at', staleSince);

    return NextResponse.json({ success: true, expiredTransactions: expiredTransactions?.length ?? 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Checkout cleanup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
