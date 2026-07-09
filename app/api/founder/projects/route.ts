import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q')?.trim();

    let query = supabaseAdmin
      .from('projects')
      .select(`
        *,
        buyer:profiles!buyer_id(id, full_name, email, account_status),
        skills:project_skills(skill)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (status) query = query.eq('status', status);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    const { data: stats } = await supabaseAdmin
      .from('projects')
      .select('status')
      .is('deleted_at', null);

    const statusCounts = (stats ?? []).reduce(
      (acc: Record<string, number>, row: { status: string }) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({ projects: data ?? [], statusCounts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { projectId, action, reason } = (await req.json()) as {
      projectId: string;
      action: 'feature' | 'unfeature' | 'remove' | 'restore';
      reason?: string;
    };

    if (!projectId || !action) {
      return NextResponse.json({ error: 'projectId and action required' }, { status: 400 });
    }

    let updates: Record<string, unknown> = {};
    switch (action) {
      case 'feature':
        updates = { is_featured: true };
        break;
      case 'unfeature':
        updates = { is_featured: false };
        break;
      case 'remove':
        updates = { deleted_at: new Date().toISOString(), status: 'cancelled' };
        break;
      case 'restore':
        updates = { deleted_at: null, status: 'published' };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    if (reason) {
      await supabaseAdmin.from('content_reports').insert({
        reporter_id: auth.actor.id,
        entity_type: 'project',
        entity_id: projectId,
        reason: `Founder action: ${action} — ${reason}`,
        status: 'actioned',
        reviewed_by: auth.actor.id,
        reviewed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ project: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
