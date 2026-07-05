import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';

export async function requireBuilderAccount() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: 'Unauthorized' as const, status: 401 as const };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, is_freelancer, role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  const isBuilder = profile?.is_freelancer === true || profile?.role === 'builder';
  if (!isBuilder) {
    return { error: 'Forbidden' as const, status: 403 as const };
  }

  return { user, profile, supabaseAdmin };
}
