import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { askProjectQuestion, answerProjectQuestion } from '@/lib/open-projects/service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('project_questions')
      .select('*, asker:profiles_public!asker_id(full_name, avatar_url)')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ questions: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch questions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = (await req.json()) as { question?: string; questionId?: string; answer?: string };
    const supabase = await createSupabaseServerClient();

    if (body.questionId && body.answer) {
      const question = await answerProjectQuestion(supabase, body.questionId, user.id, body.answer);
      return NextResponse.json({ question });
    }

    if (!body.question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const question = await askProjectQuestion(supabase, id, user.id, body.question);
    return NextResponse.json({ question }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process question';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
