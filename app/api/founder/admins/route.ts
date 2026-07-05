import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

export async function GET() {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .eq('is_admin', true)
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ admins: data ?? [] });
}
