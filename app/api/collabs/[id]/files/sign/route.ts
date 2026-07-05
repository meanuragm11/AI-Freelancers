import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { bucket, path, fileName } = await req.json();
    if (!bucket || !path) {
      return NextResponse.json({ error: 'Storage bucket and path are required' }, { status: 400 });
    }

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

    if (!String(path).startsWith(`${id}/`)) {
      return NextResponse.json({ error: 'File is outside this workspace' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, 60, { download: fileName || true });

    if (error) throw error;

    return NextResponse.json({ url: data.signedUrl, expiresIn: 60 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to authorize file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
