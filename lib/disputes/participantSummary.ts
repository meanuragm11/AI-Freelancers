import type { SupabaseClient } from '@supabase/supabase-js';
import { formatProfileDisplayName } from '@/lib/display/formatDisplayName';

export type DisputeParticipantSummary = {
  id: string;
  display_name: string;
  email: string | null;
  country: string | null;
  member_since: string;
  completed_projects: number;
  is_verified: boolean;
  verified_buyer: boolean;
  profile_href: string;
};

async function countCompletedCollabs(
  supabaseAdmin: SupabaseClient,
  profileId: string,
  role: 'buyer' | 'builder'
) {
  const column = role === 'buyer' ? 'buyer_id' : 'builder_id';
  const { count, error } = await supabaseAdmin
    .from('collabs')
    .select('id', { count: 'exact', head: true })
    .eq(column, profileId)
    .in('status', ['completed', 'released']);

  if (error) throw error;
  return count ?? 0;
}

export async function loadDisputeParticipantSummaries(
  supabaseAdmin: SupabaseClient,
  buyerId: string,
  builderId: string
) {
  const [{ data: profiles, error: profileError }, buyerCompleted, builderCompleted, buyerAuth, builderAuth] =
    await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, is_verified, verified_buyer, location, created_at')
        .in('id', [buyerId, builderId]),
      countCompletedCollabs(supabaseAdmin, buyerId, 'buyer'),
      countCompletedCollabs(supabaseAdmin, builderId, 'builder'),
      supabaseAdmin.auth.admin.getUserById(buyerId).catch(() => null),
      supabaseAdmin.auth.admin.getUserById(builderId).catch(() => null),
    ]);

  if (profileError) throw profileError;

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  function build(profileId: string, role: 'buyer' | 'builder', completed: number): DisputeParticipantSummary {
    const profile = byId.get(profileId);
    const authUser = profileId === buyerId ? buyerAuth : builderAuth;
    const email = authUser?.data?.user?.email ?? null;

    return {
      id: profileId,
      display_name: formatProfileDisplayName(profile, email),
      email,
      country: profile?.location ?? null,
      member_since: profile?.created_at ?? new Date(0).toISOString(),
      completed_projects: completed,
      is_verified: Boolean(profile?.is_verified),
      verified_buyer: Boolean(profile?.verified_buyer),
      profile_href: `/founder/users/${profileId}`,
    };
  }

  return {
    buyer: build(buyerId, 'buyer', buyerCompleted),
    builder: build(builderId, 'builder', builderCompleted),
  };
}
