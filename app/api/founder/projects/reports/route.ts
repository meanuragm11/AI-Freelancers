import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';

export async function GET() {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from('content_reports')
      .select(`
        *,
        reporter:profiles!reporter_id(full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ reports: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity_type, entity_id, reason, details } = (await req.json()) as {
      entity_type: 'project' | 'proposal' | 'profile';
      entity_id: string;
      reason: string;
      details?: string;
    };

    if (!entity_type || !entity_id || !reason?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        entity_type,
        entity_id,
        reason: reason.trim(),
        details: details?.trim() ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ report: data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { reportId, status } = (await req.json()) as {
      reportId: string;
      status: 'reviewed' | 'actioned' | 'dismissed';
    };

    const { data, error } = await supabaseAdmin
      .from('content_reports')
      .update({
        status,
        reviewed_by: auth.actor.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ report: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
