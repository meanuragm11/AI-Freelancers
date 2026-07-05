import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import {
  ACTIVE_COLLAB_STATUSES,
  COMPLETED_COLLAB_STATUSES,
} from '@/lib/marketplace/status';

const PAID_TRANSACTION_STATUSES = ['completed', 'paid', 'captured'] as const;
const SERVICE_TRANSACTION_TYPES = [
  'escrow_funding',
  'collab_milestone',
  'milestone_funding',
  'revision_purchase',
] as const;

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createSupabaseAdminClient();
    const purchasedCollabStatuses = [
      ...ACTIVE_COLLAB_STATUSES,
      ...COMPLETED_COLLAB_STATUSES,
    ];

    const [libraryRes, componentTxRes, serviceCollabRes, serviceTxRes] = await Promise.all([
      supabaseAdmin
        .from('library')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', user.id)
        .eq('transaction_type', 'component_purchase')
        .in('status', [...PAID_TRANSACTION_STATUSES]),
      supabaseAdmin
        .from('collabs')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', user.id)
        .in('status', [...purchasedCollabStatuses]),
      supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', user.id)
        .in('transaction_type', [...SERVICE_TRANSACTION_TYPES])
        .in('status', [...PAID_TRANSACTION_STATUSES]),
    ]);

    if (libraryRes.error) throw libraryRes.error;
    if (componentTxRes.error) throw componentTxRes.error;
    if (serviceCollabRes.error) throw serviceCollabRes.error;
    if (serviceTxRes.error) throw serviceTxRes.error;

    const hasComponentPurchase =
      (libraryRes.count ?? 0) > 0 || (componentTxRes.count ?? 0) > 0;
    const hasServicePurchase =
      (serviceCollabRes.count ?? 0) > 0 || (serviceTxRes.count ?? 0) > 0;

    return NextResponse.json({
      hasPurchases: hasComponentPurchase || hasServicePurchase,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check purchases';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
