import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { SUPPORT_ACTIVE_STATUSES, SUPPORT_RESOLVED_STATUSES } from '@/lib/support/constants';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const view = searchParams.get('view');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const userId = searchParams.get('userId');
    const q = searchParams.get('q')?.trim();

    let query = supabaseAdmin
      .from('support_tickets')
      .select(
        'id, ticket_number, user_id, name, email, category, subject, status, priority, assigned_to, transaction_id, escrow_id, project_id, service_id, ai_asset_id, created_at, updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(200);

    if (view === 'active') {
      query = query.in('status', [...SUPPORT_ACTIVE_STATUSES]);
    } else if (view === 'resolved') {
      query = query.in('status', [...SUPPORT_RESOLVED_STATUSES]);
    }

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (priority) query = query.eq('priority', priority);
    if (userId) query = query.eq('user_id', userId);
    if (assignedTo === 'unassigned') {
      query = query.is('assigned_to', null);
    } else if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }
    if (q) {
      query = query.or(
        `ticket_number.ilike.%${q}%,subject.ilike.%${q}%,email.ilike.%${q}%,name.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ tickets: data ?? [] });
  } catch (error: unknown) {
    console.error('Founder tickets list error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
