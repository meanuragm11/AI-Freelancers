import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { ProfileAccountFlags } from '@/lib/accountMode';

export async function resolveWorkspaceProfile(): Promise<{
  userId: string | null;
  profile: ProfileAccountFlags | null;
}> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_freelancer, role')
    .eq('id', user.id)
    .maybeSingle();

  return { userId: user.id, profile };
}
