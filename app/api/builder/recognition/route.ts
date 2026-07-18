import { NextResponse } from 'next/server';
import { computeBuilderBadges } from '@/lib/arena';
import { requireBuilderAccount } from '@/lib/server/builderAuth';

export async function GET() {
  try {
    const auth = await requireBuilderAccount();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabaseAdmin = auth.supabaseAdmin;
    const snapshot = await computeBuilderBadges(supabaseAdmin, auth.user.id);
    if (!snapshot) {
      return NextResponse.json({ error: 'Builder profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      badges: snapshot.badges,
      primaryBadge: snapshot.primaryBadge,
      nextBadge: snapshot.nextBadge,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load recognition';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
