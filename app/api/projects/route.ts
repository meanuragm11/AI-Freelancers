import { NextResponse } from 'next/server';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  getAuthenticatedUser,
} from '@/lib/server/supabase';
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from '@/lib/server/rateLimit';
import { browseProjects, createProject, listBuyerProjects } from '@/lib/open-projects/service';
import { validateProjectInput, sanitizeBuilderPreferences } from '@/lib/open-projects/validation';
import { assertProfileCan, ModerationBlockedError } from '@/lib/moderation/checks';
import type { CreateProjectInput } from '@/lib/open-projects/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get('mine') === 'true';

    if (mine) {
      const user = await getAuthenticatedUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const supabase = await createSupabaseServerClient();
      const projects = await listBuyerProjects(supabase, user.id);
      return NextResponse.json({ projects });
    }

    const limit = checkRateLimit(`projects-browse:${req.headers.get('x-forwarded-for') ?? 'anon'}`, 60, 60000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const supabase = await createSupabaseServerClient();
    const result = await browseProjects(supabase, {
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      experience_level: (searchParams.get('experience_level') as never) ?? undefined,
      budget_min: searchParams.get('budget_min') ? Number(searchParams.get('budget_min')) : undefined,
      budget_max: searchParams.get('budget_max') ? Number(searchParams.get('budget_max')) : undefined,
      sort: (searchParams.get('sort') as never) ?? 'newest',
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : 0,
    });

    return NextResponse.json(result, { headers: rateLimitHeaders(limit) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = checkRateLimit(`projects-create:${user.id}`, 10, 3600000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = (await req.json()) as CreateProjectInput;
    if (!body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const sanitized = {
      ...body,
      visibility: 'public' as const,
      builder_preferences: sanitizeBuilderPreferences(body.builder_preferences),
    };

    const validation = validateProjectInput(sanitized, {
      requireBudget: sanitized.status === 'published',
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    await assertProfileCan(supabase, user.id, 'publish', 'Your account cannot post projects at this time.');

    const project = await createProject(supabase, user.id, sanitized);
    return NextResponse.json({ project }, { status: 201, headers: rateLimitHeaders(limit) });
  } catch (error: unknown) {
    if (error instanceof ModerationBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
