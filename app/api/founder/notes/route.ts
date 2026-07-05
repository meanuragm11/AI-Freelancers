import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';
import { INTERNAL_NOTE_ENTITY_TYPES } from '@/lib/founder/constants';

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  if (!entityType || !entityId || !INTERNAL_NOTE_ENTITY_TYPES.includes(entityType as never)) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('admin_internal_notes')
    .select('id, body, created_at, created_by, author:created_by(full_name)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { entityType, entityId, note } = body;

    if (!entityType || !entityId || !note?.trim()) {
      return NextResponse.json({ error: 'entityType, entityId, and note are required' }, { status: 400 });
    }

    if (!INTERNAL_NOTE_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_internal_notes')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        body: note.trim(),
        created_by: auth.actor.id,
      })
      .select('id, body, created_at, created_by, author:created_by(full_name)')
      .single();

    if (error) throw error;

    await logAdminAction({
      actor: auth.actor,
      action: 'internal_note.create',
      targetType: entityType,
      targetId: entityId,
      metadata: { noteId: data.id },
    });

    return NextResponse.json({ note: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
