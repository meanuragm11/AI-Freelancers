import type { SupabaseClient } from '@supabase/supabase-js';

export type ArenaBuilder = {
  id: string;
  full_name: string;
  headline: string;
  avatar_url?: string;
  components_count: number;
  sales_count: number;
  rank: number;
};

export async function fetchArenaBuilders(
  supabase: SupabaseClient,
  limit?: number
): Promise<ArenaBuilder[]> {
  const { data: components, error: componentsError } = await supabase
    .from('components')
    .select('builder_id, sales_count, status')
    .eq('status', 'published');

  if (componentsError) throw componentsError;

  const statsByBuilder = new Map<string, { published: number; sales: number }>();
  for (const component of components ?? []) {
    if (!component.builder_id) continue;
    const current = statsByBuilder.get(component.builder_id) ?? { published: 0, sales: 0 };
    current.published += 1;
    current.sales += Number(component.sales_count ?? 0);
    statsByBuilder.set(component.builder_id, current);
  }

  const builderIds = Array.from(statsByBuilder.keys());
  if (builderIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles_public')
    .select('id, full_name, headline, avatar_url')
    .in('id', builderIds);

  if (profilesError) throw profilesError;

  const ranked = (profiles ?? [])
    .map((profile) => {
      const stats = statsByBuilder.get(profile.id) ?? { published: 0, sales: 0 };
      return {
        id: profile.id,
        full_name: profile.full_name ?? 'Expert',
        headline: profile.headline ?? 'AI Builder',
        avatar_url: profile.avatar_url ?? undefined,
        components_count: stats.published,
        sales_count: stats.sales,
        rank: 0,
      };
    })
    .filter((builder) => builder.components_count > 0)
    .sort((a, b) => {
      if (b.sales_count !== a.sales_count) return b.sales_count - a.sales_count;
      if (b.components_count !== a.components_count) return b.components_count - a.components_count;
      return a.full_name.localeCompare(b.full_name);
    })
    .map((builder, index) => ({ ...builder, rank: index + 1 }));

  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
}
