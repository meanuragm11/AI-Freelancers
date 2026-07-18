import { NextResponse } from 'next/server';
import { formatBuilderName } from '@/lib/display/formatBuilderName';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { fetchLibraryAssetsForUser } from '@/lib/buyer/library';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createSupabaseAdminClient();
    const assets = await fetchLibraryAssetsForUser(supabaseAdmin, user.id);

    return NextResponse.json({
      assets: assets.map((asset) => ({
        id: asset.id,
        purchased_at: asset.purchased_at,
        source: asset.source,
        component_id: asset.component_id,
        service_id: asset.service_id,
        version: asset.version,
        asset_type: asset.asset_type,
        has_download: asset.has_download,
        files_count: asset.files.length,
        components: {
          id: asset.component.id,
          title: asset.component.title,
          description: asset.component.description,
          category: asset.component.category,
          thumbnail_url: asset.component.thumbnail_url,
          delivery_method: asset.component.delivery_method,
          builder_id: asset.component.builder_id,
          status: asset.component.status,
          has_download: asset.has_download,
        },
        builder: asset.builder
          ? {
              id: asset.builder.id,
              full_name: formatBuilderName(asset.builder.full_name),
              avatar_url: asset.builder.avatar_url,
              headline: asset.builder.headline,
            }
          : null,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load library';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
