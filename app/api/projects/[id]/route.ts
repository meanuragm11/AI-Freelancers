import { NextResponse } from 'next/server';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  getAuthenticatedUser,
} from '@/lib/server/supabase';
import {
  getProjectById,
  softDeleteProject,
  updateProject,
} from '@/lib/open-projects/service';
import { canEditProject } from '@/lib/open-projects/permissions';
import { incrementProjectViews } from '@/lib/open-projects/service';
import { validateProjectInput, sanitizeBuilderPreferences } from '@/lib/open-projects/validation';
import type { CreateProjectInput } from '@/lib/open-projects/types';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const project = await getProjectById(supabase, id);

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const user = await getAuthenticatedUser();
    if (project.status === 'published') {
      const admin = createSupabaseAdminClient();
      void incrementProjectViews(admin, id, user?.id);
    }

    return NextResponse.json({ project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const existing = await getProjectById(supabase, id);

    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!(await canEditProject(existing, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as Partial<CreateProjectInput>;
    const mergedCategory = body.category ?? existing.category;
    const mergedPrefs = body.builder_preferences
      ? sanitizeBuilderPreferences(body.builder_preferences)
      : existing.builder_preferences;
    const mergedBudgetMax =
      body.budget_max_usd !== undefined ? body.budget_max_usd : existing.budget_max_usd;
    const mergedBudgetMin =
      body.budget_min_usd !== undefined ? body.budget_min_usd : existing.budget_min_usd;
    const mergedStatus = body.status ?? existing.status;

    const validation = validateProjectInput(
      {
        category: mergedCategory,
        budget_max_usd: mergedBudgetMax,
        budget_min_usd: mergedBudgetMin,
        builder_preferences: mergedPrefs,
        status: mergedStatus,
      },
      { requireBudget: mergedStatus === 'published' }
    );
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const sanitized = {
      ...body,
      visibility: 'public' as const,
      builder_preferences: body.builder_preferences
        ? sanitizeBuilderPreferences(body.builder_preferences)
        : undefined,
    };

    const project = await updateProject(supabase, id, user.id, sanitized);
    return NextResponse.json({ project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const project = await softDeleteProject(supabase, id, user.id);
    return NextResponse.json({ project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
