import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import {
  fetchLibraryAssetById,
  normalizeChangelog,
  parseAssetMetadata,
} from '@/lib/buyer/library';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();
    const asset = await fetchLibraryAssetById(supabaseAdmin, user.id, id);

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found in your library' }, { status: 404 });
    }

    const metadata = parseAssetMetadata(asset.component.asset_metadata);

    let builderReviews: Array<{
      id: string;
      rating: number;
      review: string | null;
      created_at: string;
    }> = [];

    if (asset.component.builder_id) {
      const { data: reviews } = await supabaseAdmin
        .from('reviews')
        .select('id, rating, review, created_at')
        .eq('builder_id', asset.component.builder_id)
        .order('created_at', { ascending: false })
        .limit(8);

      builderReviews = reviews ?? [];
    }

    let existingConversationId: string | null = null;
    if (asset.component.builder_id) {
      const { data: collab } = await supabaseAdmin
        .from('collabs')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('builder_id', asset.component.builder_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      existingConversationId = collab?.id ?? null;
    }

    return NextResponse.json({
      asset: {
        id: asset.id,
        purchased_at: asset.purchased_at,
        source: asset.source,
        component_id: asset.component_id,
        service_id: asset.service_id,
        version: asset.version,
        asset_type: asset.asset_type,
        has_download: asset.has_download,
        files: asset.files,
        component: {
          id: asset.component.id,
          title: asset.component.title,
          description: asset.component.description,
          category: asset.component.category,
          thumbnail_url: asset.component.thumbnail_url,
          delivery_method: asset.component.delivery_method,
          builder_id: asset.component.builder_id,
          published_at: asset.component.published_at,
          status: asset.component.status,
        },
        guides: {
          installation: metadata.installation_guide?.trim() || null,
          usage: metadata.usage_guide?.trim() || null,
          documentation: metadata.documentation?.trim() || null,
        },
        changelog: normalizeChangelog(metadata, asset.component.published_at),
        included_resources: metadata.included_resources ?? [],
        builder: asset.builder,
        builder_reviews: builderReviews,
        existing_conversation_id: existingConversationId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load asset';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
