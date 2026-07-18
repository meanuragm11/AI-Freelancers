import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabase';
import { processProjectActivityMonitoring } from '@/lib/open-projects/activityMonitoring';
import { evaluateInactiveBuyerStatus } from '@/lib/open-projects/buyerRestrictions';
import { processVerifiedBuyerBatch } from '@/lib/open-projects/verifiedBuyer';

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? process.env.ADMIN_SECRET;
  if (!secret) return process.env.NODE_ENV === 'development';

  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activity = await processProjectActivityMonitoring();
    const verifiedBuyersProcessed = await processVerifiedBuyerBatch(100);

    const admin = createSupabaseAdminClient();
    const { data: restrictedBuyers } = await admin
      .from('profiles')
      .select('id')
      .not('inactive_buyer_restricted_until', 'is', null)
      .limit(200);

    let restrictionsEvaluated = 0;
    for (const buyer of restrictedBuyers ?? []) {
      await evaluateInactiveBuyerStatus(admin, buyer.id);
      restrictionsEvaluated += 1;
    }

    return NextResponse.json({
      ok: true,
      activity,
      verifiedBuyersProcessed,
      restrictionsEvaluated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
