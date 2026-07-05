import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { isUuid } from '@/lib/founder/utils';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    let query = supabaseAdmin
      .from('profiles')
      .select(
        'id, full_name, role, is_freelancer, is_admin, is_verified, kyc_status, average_rating, review_count, created_at, last_active_at, account_status, suspension_type'
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (q) {
      query = isUuid(q) ? query.eq('id', q) : query.ilike('full_name', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ users: data ?? [] });
  } catch (error: unknown) {
    console.error('Founder users search error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
