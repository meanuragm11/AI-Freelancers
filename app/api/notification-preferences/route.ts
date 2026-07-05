import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';

const DEFAULT_PREFERENCES = {
  direct_messages_email: true,
  milestones_email: true,
  purchases_email: true,
  disputes_email: true,
  marketing_email: false,
};

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      preferences: data ?? { user_id: user.id, ...DEFAULT_PREFERENCES },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load preferences';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const updates = {
      direct_messages_email: Boolean(body.direct_messages_email),
      milestones_email: Boolean(body.milestones_email),
      purchases_email: Boolean(body.purchases_email),
      disputes_email: Boolean(body.disputes_email),
      marketing_email: Boolean(body.marketing_email),
    };

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, preferences: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update preferences';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
