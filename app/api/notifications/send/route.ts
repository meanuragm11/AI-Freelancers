import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import {
  sendNotification,
  NotificationType,
  type SendNotificationParams,
} from '@/lib/notifications/notificationService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyActorAccess(
  actorId: string,
  params: SendNotificationParams
): Promise<boolean> {
  if (params.metadata?.actorId && params.metadata.actorId !== actorId) {
    return false;
  }

  const collabId =
    typeof params.metadata?.collabId === 'string'
      ? params.metadata.collabId
      : typeof params.metadata?.conversationId === 'string'
        ? params.metadata.conversationId
        : undefined;

  if (!collabId) {
    return params.recipientId === actorId;
  }

  const { data: collab } = await supabaseAdmin
    .from('collabs')
    .select('buyer_id, builder_id')
    .eq('id', collabId)
    .maybeSingle();

  if (!collab) return false;

  const participants = [collab.buyer_id, collab.builder_id].filter(
    (id): id is string => typeof id === 'string'
  );
  return participants.includes(actorId) && participants.includes(params.recipientId);
}

function buildIdempotencyKey(actorId: string, params: SendNotificationParams) {
  const metadata = params.metadata ?? {};
  const scope =
    typeof metadata.milestoneId === 'string'
      ? metadata.milestoneId
      : typeof metadata.collabId === 'string'
        ? metadata.collabId
        : typeof metadata.conversationId === 'string'
          ? metadata.conversationId
          : params.link ?? 'self';

  return [actorId, params.recipientId, params.type, scope, params.title].join(':');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SendNotificationParams>;

    if (!body.type || !body.recipientId || !body.title || !body.message) {
      return NextResponse.json(
        { error: 'type, recipientId, title, and message are required' },
        { status: 400 }
      );
    }

    if (!Object.values(NotificationType).includes(body.type as NotificationType)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (body.metadata?.actorId && body.metadata.actorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params: SendNotificationParams = {
      type: body.type as NotificationType,
      recipientId: body.recipientId,
      title: body.title,
      message: body.message,
      link: body.link,
      metadata: {
        ...(body.metadata ?? {}),
        actorId: user.id,
        idempotencyKey:
          typeof body.metadata?.idempotencyKey === 'string'
            ? body.metadata.idempotencyKey
            : buildIdempotencyKey(user.id, body as SendNotificationParams),
      },
      skipDbInsert: false,
    };

    const allowed = await verifyActorAccess(user.id, params);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await sendNotification(params);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
