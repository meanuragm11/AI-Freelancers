import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import { parseAssetMetadata } from '@/lib/buyer/library';

type RouteParams = { params: Promise<{ id: string }> };

const SIGNED_URL_EXPIRES_SECONDS = 60;

type DownloadBody = {
  fileKey?: string;
};

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as DownloadBody;
    const fileKey = body.fileKey || 'primary';

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: libraryEntry, error: libraryError } = await supabaseAdmin
      .from('library')
      .select(`
        id,
        component_id,
        components (
          id,
          title,
          delivery_method,
          secure_payload_text,
          asset_bucket,
          asset_file_path,
          asset_file_name,
          file_url,
          asset_metadata,
          status
        )
      `)
      .eq('user_id', user.id)
      .eq('component_id', id)
      .maybeSingle();

    if (libraryError) throw libraryError;
    const component = libraryEntry?.components as
      | {
          id: string;
          title?: string;
          delivery_method?: string | null;
          secure_payload_text?: string | null;
          asset_bucket?: string | null;
          asset_file_path?: string | null;
          asset_file_name?: string | null;
          file_url?: string | null;
          asset_metadata?: unknown;
          status?: string | null;
        }
      | null
      | undefined;

    if (!libraryEntry || !component) {
      return NextResponse.json({ error: 'You have not purchased this asset' }, { status: 403 });
    }

    if (component.status && component.status !== 'published' && component.status !== 'archived') {
      return NextResponse.json({ error: 'Asset is no longer available' }, { status: 409 });
    }

    const metadata = parseAssetMetadata(component.asset_metadata);

    if (fileKey === 'secure_text' || (fileKey === 'primary' && component.delivery_method === 'secure_text')) {
      if (!component.secure_payload_text) {
        return NextResponse.json({ error: 'Asset payload is missing' }, { status: 404 });
      }

      return NextResponse.json({
        deliveryMethod: 'secure_text',
        title: component.title,
        payload: component.secure_payload_text,
        fileKey: 'secure_text',
      });
    }

    if (fileKey.startsWith('additional:')) {
      const index = Number(fileKey.split(':')[1]);
      const extra = metadata.additional_files?.[index];
      if (!extra?.bucket || !extra?.path) {
        return NextResponse.json({ error: 'Requested file was not found' }, { status: 404 });
      }

      const { data, error: signedUrlError } = await supabaseAdmin.storage
        .from(extra.bucket)
        .createSignedUrl(extra.path, SIGNED_URL_EXPIRES_SECONDS, {
          download: extra.name || true,
        });

      if (signedUrlError) throw signedUrlError;

      return NextResponse.json({
        deliveryMethod: 'file',
        title: component.title,
        url: data.signedUrl,
        fileName: extra.name,
        expiresIn: SIGNED_URL_EXPIRES_SECONDS,
        fileKey,
      });
    }

    if (fileKey === 'legacy_url') {
      if (!component.file_url) {
        return NextResponse.json({ error: 'Legacy download URL is missing' }, { status: 404 });
      }

      return NextResponse.json({
        deliveryMethod: 'legacy_url',
        title: component.title,
        url: component.file_url,
        warning: 'This legacy asset should be migrated to private storage.',
        fileKey,
      });
    }

    if (component.asset_bucket && component.asset_file_path) {
      const { data, error: signedUrlError } = await supabaseAdmin.storage
        .from(component.asset_bucket)
        .createSignedUrl(component.asset_file_path, SIGNED_URL_EXPIRES_SECONDS, {
          download: component.asset_file_name || true,
        });

      if (signedUrlError) throw signedUrlError;

      return NextResponse.json({
        deliveryMethod: 'file',
        title: component.title,
        url: data.signedUrl,
        fileName: component.asset_file_name,
        expiresIn: SIGNED_URL_EXPIRES_SECONDS,
        fileKey: 'primary',
      });
    }

    if (component.file_url) {
      return NextResponse.json({
        deliveryMethod: 'legacy_url',
        title: component.title,
        url: component.file_url,
        warning: 'This legacy asset should be migrated to private storage.',
        fileKey: 'legacy_url',
      });
    }

    if (component.secure_payload_text) {
      return NextResponse.json({
        deliveryMethod: 'secure_text',
        title: component.title,
        payload: component.secure_payload_text,
        fileKey: 'secure_text',
      });
    }

    return NextResponse.json({ error: 'Asset download is not configured' }, { status: 404 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Download authorization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
