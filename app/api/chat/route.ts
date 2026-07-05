import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Admin Supabase Client (bypasses RLS to flag messages securely)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// THE LEAKAGE TRIPWIRE REGEX
// Catches: whatsapp, tg, telegram, phone numbers (+91...), skype, email formats
const LEAKAGE_REGEX = /whatsapp|telegram|skype|zoom|discord|@gmail|\.com|\+?\d{10,12}|w-a|wa\.me/i;

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

    // 1. Scan the message for platform leakage
    const isFlagged = LEAKAGE_REGEX.test(content);

    // 2. If flagged, you can ping your Discord Webhook here in the future
    if (isFlagged) {
      console.log(`🚨 LEAKAGE ALERT! User ${senderId} attempted to share contact info.`);
      // await fetch('YOUR_DISCORD_WEBHOOK_URL', { ... }) 
    }

    // 3. Save the message to the database (with the flag status attached)
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        collab_id: collabId,
        sender_id: senderId,
        content: content,
        is_flagged: isFlagged
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: data });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}