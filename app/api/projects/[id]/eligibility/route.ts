import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { getProjectById, getBuilderProposalEligibility } from '@/lib/open-projects/service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const project = await getProjectById(supabase, id);

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const user = await getAuthenticatedUser();
    const eligibility = await getBuilderProposalEligibility(supabase, project, user?.id ?? null);

    return NextResponse.json({ eligibility, projectStatus: project.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check eligibility';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
