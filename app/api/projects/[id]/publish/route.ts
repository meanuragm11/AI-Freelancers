import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { publishProject, getProjectById } from '@/lib/open-projects/service';
import { assertProfileCan, ModerationBlockedError } from '@/lib/moderation/checks';
import { validateProjectInput } from '@/lib/open-projects/validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { acknowledgeDuplicate?: boolean };
    const supabase = await createSupabaseServerClient();
    await assertProfileCan(supabase, user.id, 'publish', 'Your account cannot publish projects.');

    const existing = await getProjectById(supabase, id);
    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (existing.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const validation = validateProjectInput(
      {
        category: existing.category,
        budget_max_usd: existing.budget_max_usd,
        budget_min_usd: existing.budget_min_usd,
        builder_preferences: existing.builder_preferences,
        status: 'published',
      },
      { requireBudget: true }
    );
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { project, moderation } = await publishProject(supabase, id, user.id, {
      acknowledgeDuplicate: body.acknowledgeDuplicate === true,
    });
    return NextResponse.json({ project, moderation });
  } catch (error: unknown) {
    if (error instanceof ModerationBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Failed to publish project';
    const isDuplicate = message.includes('similar') || message.includes('Duplicate');
    const isLimit = message.includes('Publishing limit') || message.includes('temporary publishing limit');
    return NextResponse.json(
      { error: message, code: isDuplicate ? 'duplicate_detected' : isLimit ? 'buyer_limit' : undefined },
      { status: isDuplicate || isLimit ? 409 : 500 }
    );
  }
}
