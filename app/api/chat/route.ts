import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { assertProfileCan, ModerationBlockedError } from '@/lib/moderation/checks';
import { queueChatModeration } from '@/lib/moderation';
import { scanChatContent } from '@/lib/moderation/regex/scan';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getServerUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function POST(req: Request) {
  try {
    const { collabId, senderId, content } = await req.json();

    if (!collabId || !senderId || !content) {
      return NextResponse.json({ error: 'Missing chat data' }, { status: 400 });
    }

    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (senderId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: collab, error: collabError } = await supabaseAdmin
      .from('collabs')
      .select('buyer_id, builder_id')
      .eq('id', collabId)
      .maybeSingle();

    if (collabError) throw collabError;
    if (!collab || (collab.buyer_id !== user.id && collab.builder_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    await assertProfileCan(supabase, user.id, 'message', 'Your account cannot send messages.');

    const regexScan = scanChatContent(content);
    const isFlagged = regexScan.suspicious;

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        collab_id: collabId,
        sender_id: senderId,
        content: content,
        is_flagged: isFlagged,
        moderation_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    queueChatModeration({
      messageId: data.id,
      collabId,
      senderId,
      content,
    });

    return NextResponse.json({ success: true, message: data });

  } catch (error: unknown) {
    if (error instanceof ModerationBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}