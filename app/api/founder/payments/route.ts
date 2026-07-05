import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { isUuid } from '@/lib/founder/utils';

async function matchingProfileIds(q: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('full_name', `%${q}%`)
    .limit(50);
  return (data ?? []).map((row) => row.id);
}

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'transactions';
    const q = searchParams.get('q')?.trim();

    if (tab === 'withdrawals') {
      let query = supabaseAdmin
        .from('builder_withdrawals')
        .select(
          `id, builder_id, amount_usd, status, reference_code, failure_reason, rejection_reason, created_at, completed_at,
           builder:builder_id(id, full_name)`
        )
        .order('created_at', { ascending: false })
        .limit(200);

      if (q) {
        if (isUuid(q)) {
          query = query.or(`id.eq.${q},builder_id.eq.${q}`);
        } else {
          const ids = await matchingProfileIds(q);
          const filters = [`reference_code.ilike.%${q}%`];
          if (ids.length > 0) filters.push(`builder_id.in.(${ids.join(',')})`);
          query = query.or(filters.join(','));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ withdrawals: data ?? [] });
    }

    if (tab === 'escrow') {
      let query = supabaseAdmin
        .from('collabs')
        .select(
          `id, title, status, escrow_amount_usd, payment_type, buyer_id, builder_id, created_at, updated_at,
           buyer:buyer_id(id, full_name), builder:builder_id(id, full_name)`
        )
        .order('updated_at', { ascending: false })
        .limit(200);

      if (q) {
        if (isUuid(q)) {
          query = query.or(`id.eq.${q},buyer_id.eq.${q},builder_id.eq.${q}`);
        } else {
          const ids = await matchingProfileIds(q);
          const filters = [`title.ilike.%${q}%`];
          if (ids.length > 0) {
            filters.push(`buyer_id.in.(${ids.join(',')})`, `builder_id.in.(${ids.join(',')})`);
          }
          query = query.or(filters.join(','));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ escrow: data ?? [] });
    }

    // Default: transactions (platform revenue, service/asset/milestone purchases)
    let query = supabaseAdmin
      .from('transactions')
      .select(
        `id, order_id, buyer_id, item_id, transaction_type, amount_usd, fee_usd, status,
         razorpay_payment_id, created_at, updated_at, metadata, buyer:buyer_id(id, full_name)`
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (q) {
      if (isUuid(q)) {
        query = query.or(`id.eq.${q},buyer_id.eq.${q},item_id.eq.${q}`);
      } else {
        const ids = await matchingProfileIds(q);
        const filters = [`order_id.ilike.%${q}%`, `razorpay_payment_id.ilike.%${q}%`];
        if (ids.length > 0) filters.push(`buyer_id.in.(${ids.join(',')})`);
        query = query.or(filters.join(','));
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ transactions: data ?? [] });
  } catch (error: unknown) {
    console.error('Founder payments search error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
