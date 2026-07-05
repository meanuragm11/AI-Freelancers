import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin, logAdminAction } from '@/lib/founder/server';
import { logBusinessEvent } from '@/lib/events/businessEvents';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [
      authUser,
      services,
      aiAssets,
      collabsAsBuyer,
      collabsAsBuilder,
      transactions,
      reviews,
      supportTickets,
      disputesAsBuyer,
      disputesAsBuilder,
      withdrawals,
      notes,
    ] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(id).catch(() => null),
      supabaseAdmin
        .from('services')
        .select('id, title, status, starting_price_usd, order_count, created_at')
        .eq('builder_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('components')
        .select('id, title, status, price_usd, sales_count, created_at')
        .eq('builder_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('collabs')
        .select('id, title, status, escrow_amount_usd, builder_id, created_at')
        .eq('buyer_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('collabs')
        .select('id, title, status, escrow_amount_usd, buyer_id, created_at')
        .eq('builder_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('transactions')
        .select('id, order_id, transaction_type, amount_usd, fee_usd, status, created_at')
        .eq('buyer_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('reviews')
        .select('id, rating, review, created_at, buyer_id, builder_id')
        .or(`buyer_id.eq.${id},builder_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('support_tickets')
        .select('id, ticket_number, subject, status, priority, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('disputes')
        .select('id, status, primary_reason, collab_id, created_at')
        .eq('buyer_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('disputes')
        .select('id, status, primary_reason, collab_id, created_at')
        .eq('freelancer_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('builder_withdrawals')
        .select('id, amount_usd, status, reference_code, created_at')
        .eq('builder_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('admin_internal_notes')
        .select('id, body, created_at, created_by, author:created_by(full_name)')
        .eq('entity_type', 'user')
        .eq('entity_id', id)
        .order('created_at', { ascending: false }),
    ]);

    const email = authUser?.data?.user?.email ?? null;
    const lastSignInAt = authUser?.data?.user?.last_sign_in_at ?? null;
    const emailConfirmedAt = authUser?.data?.user?.email_confirmed_at ?? null;
    const authCreatedAt = authUser?.data?.user?.created_at ?? null;

    return NextResponse.json({
      profile,
      email,
      loginHistory: {
        lastSignInAt,
        emailConfirmedAt,
        authCreatedAt,
        lastActiveAt: profile.last_active_at,
      },
      services: services.data ?? [],
      aiAssets: aiAssets.data ?? [],
      projects: {
        asBuyer: collabsAsBuyer.data ?? [],
        asBuilder: collabsAsBuilder.data ?? [],
      },
      transactions: transactions.data ?? [],
      reviews: reviews.data ?? [],
      supportTickets: supportTickets.data ?? [],
      disputes: [...(disputesAsBuyer.data ?? []), ...(disputesAsBuilder.data ?? [])],
      withdrawals: withdrawals.data ?? [],
      notes: notes ?? [],
    });
  } catch (error: unknown) {
    console.error('Founder user detail error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const allowedFields = ['is_admin', 'is_verified', 'kyc_status', 'payouts_enabled'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select(allowedFields.join(','))
      .eq('id', id)
      .maybeSingle();

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    await logAdminAction({
      actor: auth.actor,
      action: 'user.update',
      targetType: 'user',
      targetId: id,
      previousValue: existing as Record<string, unknown> | null,
      newValue: updates,
    });

    void logBusinessEvent({
      eventType: 'user.updated',
      entityType: 'profile',
      entityId: id,
      actorId: auth.actor.id,
      summary: `Founder updated user fields: ${Object.keys(updates).join(', ')}`,
      metadata: { updates },
    });

    return NextResponse.json({ profile: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
