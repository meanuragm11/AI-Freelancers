import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: component, error: componentError } = await supabaseAdmin
      .from('components')
      .select('id, title, builder_id, price_usd, status, delivery_method, secure_payload_text, asset_file_path, file_url')
      .eq('id', id)
      .maybeSingle();

    if (componentError) throw componentError;
    if (!component || component.status !== 'published') {
      return NextResponse.json({ error: 'Asset is not available' }, { status: 404 });
    }

    if (Number(component.price_usd) > 0) {
      return NextResponse.json({ error: 'Paid assets must be purchased through checkout' }, { status: 409 });
    }

    const hasFulfillment =
      component.delivery_method === 'secure_text'
        ? Boolean(component.secure_payload_text)
        : Boolean(component.asset_file_path || component.file_url);

    if (!hasFulfillment) {
      return NextResponse.json({ error: 'Asset is missing fulfillment content' }, { status: 409 });
    }

    const { data: libraryEntry, error: libraryError } = await supabaseAdmin
      .from('library')
      .upsert(
        {
          user_id: user.id,
          component_id: id,
          source: 'free_acquisition',
        },
        { onConflict: 'user_id,component_id' }
      )
      .select('id')
      .single();

    if (libraryError) throw libraryError;

    void sendNotification({
      type: NotificationType.AI_ASSET_PURCHASED,
      recipientId: user.id,
      title: 'AI asset added',
      message: `"${component.title}" has been added to your library.`,
      link: '/buyer/library',
      metadata: {
        assetName: component.title,
        actorId: user.id,
        idempotencyKey: `asset-free:${user.id}:${id}`,
      },
    });

    return NextResponse.json({ success: true, libraryId: libraryEntry.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Asset acquisition failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
