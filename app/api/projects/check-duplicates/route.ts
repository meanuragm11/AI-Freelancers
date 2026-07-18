import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { checkProjectDuplicates } from '@/lib/open-projects/service';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as {
      title: string;
      description: string;
      budget_min_usd?: number | null;
      budget_max_usd?: number | null;
      skills?: string[];
      excludeProjectId?: string;
    };

    if (!body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const result = await checkProjectDuplicates(supabase, user.id, body);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check duplicates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
