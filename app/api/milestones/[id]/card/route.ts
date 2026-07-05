import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { calculateEscrowMilestonePlatformFee } from '@/lib/milestones/platformFees';
import { resolveServiceListingCheckoutAmount } from '@/lib/milestones/syncServiceCheckoutPrice';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: milestone, error } = await supabaseAdmin
      .from('milestones')
      .select(
        'id, collab_id, title, description, deliverables, amount_usd, status, due_date, is_new_milestone, order_index, created_at'
      )
      .eq('id', id)
      .single();

    if (error || !milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const { data: collab } = await supabaseAdmin
      .from('collabs')
      .select(
        'buyer_id, builder_id, title, status, service_id, payment_type, fixed_price_usd, escrow_amount_usd, proposal_platform_fee_charged, cumulative_new_milestones_fee_charged'
      )
      .eq('id', milestone.collab_id)
      .single();

    if (!collab || (collab.buyer_id !== user.id && collab.builder_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const amountUsd = await resolveServiceListingCheckoutAmount(supabaseAdmin, milestone, collab);
    milestone.amount_usd = amountUsd;

    const platformFee = await calculateEscrowMilestonePlatformFee(supabaseAdmin, milestone, collab);

    return NextResponse.json({
      milestone,
      collabTitle: collab.title,
      paymentType: collab.payment_type,
      platformFee,
      totalDue: amountUsd + platformFee,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load milestone';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
