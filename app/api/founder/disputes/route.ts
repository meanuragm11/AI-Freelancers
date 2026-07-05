import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('disputes')
      .select(
        `id, collab_id, buyer_id, freelancer_id, status, primary_reason, escrow_frozen_at,
         arbitration_requested_at, resolved_at, closed_at, created_at, updated_at,
         buyer:buyer_id(id, full_name), freelancer:freelancer_id(id, full_name),
         collab:collab_id(id, title, escrow_amount_usd, status)`
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ disputes: data ?? [] });
  } catch (error: unknown) {
    console.error('Founder disputes list error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
