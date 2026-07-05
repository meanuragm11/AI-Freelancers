import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';

type RouteParams = { params: Promise<{ id: string }> };

function parseMessageFiles(message: { id: string; sender_id: string; created_at: string; text?: string | null; content?: string | null }) {
  const body = message.text || message.content || '';
  const legacyMatches = Array.from(body.matchAll(/\[\[FILE\|(.*?)\|(.*?)\|(.*?)\]\]/g)).map((match, index) => ({
    id: `${message.id}-legacy-${index}`,
    source: 'message' as const,
    mode: 'legacy' as const,
    messageId: message.id,
    senderId: message.sender_id,
    createdAt: message.created_at,
    url: match[1],
    fileName: match[2],
    fileType: match[3],
  }));

  const privateMatches = Array.from(body.matchAll(/\[\[FILE_PATH\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]\]/g)).map((match, index) => ({
    id: `${message.id}-private-${index}`,
    source: 'message' as const,
    mode: 'private' as const,
    messageId: message.id,
    senderId: message.sender_id,
    createdAt: message.created_at,
    bucket: match[1],
    path: match[2],
    fileName: match[3],
    fileType: match[4],
  }));

  return [...legacyMatches, ...privateMatches];
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: collab, error: collabError } = await supabaseAdmin
      .from('collabs')
      .select('id, buyer_id, builder_id')
      .eq('id', id)
      .maybeSingle();

    if (collabError) throw collabError;
    if (!collab || (collab.buyer_id !== user.id && collab.builder_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [messagesResult, deliverablesResult, revisionsResult] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('id, sender_id, created_at, text, content')
        .eq('collab_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('deliverables')
        .select('id, milestone_id, submitted_by, title, description, file_bucket, file_path, file_name, file_type, file_size, attachments, status, revision_notes, accepted_at, created_at')
        .eq('collab_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('revision_requests')
        .select('id, milestone_id, deliverable_id, requested_by, reason, status, created_at, resolved_at')
        .eq('collab_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (messagesResult.error) throw messagesResult.error;
    if (deliverablesResult.error) throw deliverablesResult.error;
    if (revisionsResult.error) throw revisionsResult.error;

    const messageFiles = (messagesResult.data ?? []).flatMap(parseMessageFiles);

    return NextResponse.json({
      messageFiles,
      deliverables: deliverablesResult.data ?? [],
      revisions: revisionsResult.data ?? [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load workspace files';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
