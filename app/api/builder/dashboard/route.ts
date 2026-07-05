import { NextResponse } from 'next/server';
import { computeBuilderEarningsLedger } from '@/lib/builder/earningsLedger';
import { ACTIVE_COLLAB_STATUSES } from '@/lib/marketplace/status';
import { requireBuilderAccount } from '@/lib/server/builderAuth';

export async function GET() {
  try {
    const auth = await requireBuilderAccount();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user } = auth;
    const builderId = user.id;

    const [collabsRes, componentsRes, ledger] = await Promise.all([
      supabaseAdmin
        .from('collabs')
        .select('*, profiles_public!buyer_id(full_name, avatar_url)')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('components').select('*').eq('builder_id', builderId),
      computeBuilderEarningsLedger(supabaseAdmin, builderId),
    ]);

    if (collabsRes.error) throw collabsRes.error;
    if (componentsRes.error) throw componentsRes.error;

    const collabs = collabsRes.data ?? [];
    const components = componentsRes.data ?? [];
    const activeStatuses = ACTIVE_COLLAB_STATUSES as readonly string[];

    const activeCollabs = collabs.filter((collab) =>
      activeStatuses.includes((collab.status || '').toLowerCase())
    ).length;

    const componentSales = components.reduce(
      (sum, component) => sum + Number(component.sales_count || 0),
      0
    );

    return NextResponse.json({
      stats: {
        netEarnings: ledger.lifetimeEarnedUsd,
        pendingEscrows: ledger.pendingEscrowUsd,
        activeCollabs,
        componentSales,
      },
      collabs,
      components,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
