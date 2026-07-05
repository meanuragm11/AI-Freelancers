import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);
  const targetType = searchParams.get('targetType');
  const actorId = searchParams.get('actorId');

  let query = supabaseAdmin
    .from('admin_audit_log')
    .select('id, actor_id, actor_email, action, target_type, target_id, metadata, previous_value, new_value, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (targetType) query = query.eq('target_type', targetType);
  if (actorId) query = query.eq('actor_id', actorId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}
