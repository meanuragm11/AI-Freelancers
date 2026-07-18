import type { SupabaseClient } from '@supabase/supabase-js';

export type AssetMetadata = {
  version?: string;
  asset_type?: string;
  installation_guide?: string;
  usage_guide?: string;
  documentation?: string;
  changelog?:
    | string
    | Array<{ version: string; date?: string; notes: string; published_at?: string }>;
  included_resources?: Array<{ name: string; description?: string; url?: string }>;
  additional_files?: Array<{
    bucket: string;
    path: string;
    name: string;
    size?: number;
    content_type?: string;
  }>;
};

export type LibraryFileDescriptor = {
  key: string;
  name: string;
  size: number | null;
  content_type: string | null;
  kind: 'file' | 'secure_text' | 'legacy_url';
  previewable: boolean;
};

export type LibraryComponentFields = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  delivery_method: string | null;
  license_type: string | null;
  builder_id: string | null;
  published_at: string | null;
  created_at: string | null;
  asset_bucket: string | null;
  asset_file_path: string | null;
  asset_file_name: string | null;
  asset_file_size: number | null;
  asset_content_type: string | null;
  file_url: string | null;
  secure_payload_text: string | null;
  asset_metadata: AssetMetadata | null;
  status: string | null;
};

export type LibraryBuilderProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  average_rating: number | null;
  review_count: number | null;
};

export type LibraryAssetEntry = {
  id: string;
  purchased_at: string;
  source: string;
  component_id: string | null;
  service_id: string | null;
  component: LibraryComponentFields;
  builder: LibraryBuilderProfile | null;
  version: string;
  asset_type: string;
  files: LibraryFileDescriptor[];
  has_download: boolean;
};

const PREVIEWABLE_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export function parseAssetMetadata(raw: unknown): AssetMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as AssetMetadata;
}

export function resolveAssetVersion(metadata: AssetMetadata): string {
  const version = metadata.version?.trim();
  return version || '1.0';
}

export function resolveAssetType(category: string | null | undefined, metadata: AssetMetadata): string {
  const fromMeta = metadata.asset_type?.trim();
  if (fromMeta) return fromMeta;
  return category?.trim() || 'AI Solution';
}

export function buildSolutionLibraryFiles(service: {
  title?: string | null;
  fulfillment_payload_text?: string | null;
  fulfillment_payload_url?: string | null;
  download_file_path?: string | null;
  download_file_name?: string | null;
  download_file_size?: number | null;
  download_content_type?: string | null;
  download_metadata?: unknown;
}): LibraryFileDescriptor[] {
  const files: LibraryFileDescriptor[] = [];
  const metadata = parseAssetMetadata(service.download_metadata);

  if (service.fulfillment_payload_text) {
    files.push({
      key: 'secure_text',
      name: `${service.title || 'AI Solution'} — Secure Payload`,
      size: service.fulfillment_payload_text.length,
      content_type: 'text/plain',
      kind: 'secure_text',
      previewable: true,
    });
  }

  if (service.fulfillment_payload_url) {
    files.push({
      key: 'secure_url',
      name: `${service.title || 'AI Solution'} — Secure Link`,
      size: null,
      content_type: 'text/uri-list',
      kind: 'legacy_url',
      previewable: false,
    });
  }

  if (service.download_file_path) {
    files.push({
      key: 'primary',
      name: service.download_file_name || 'Download Package',
      size: service.download_file_size ?? null,
      content_type: service.download_content_type ?? null,
      kind: 'file',
      previewable: PREVIEWABLE_TYPES.has(service.download_content_type ?? ''),
    });
  }

  for (const [index, extra] of (metadata.additional_files ?? []).entries()) {
    if (!extra?.path || !extra?.bucket) continue;
    files.push({
      key: `additional:${index}`,
      name: extra.name || `Resource ${index + 1}`,
      size: extra.size ?? null,
      content_type: extra.content_type ?? null,
      kind: 'file',
      previewable: PREVIEWABLE_TYPES.has(extra.content_type ?? ''),
    });
  }

  return files;
}

export function buildLibraryFiles(component: LibraryComponentFields): LibraryFileDescriptor[] {
  const files: LibraryFileDescriptor[] = [];
  const metadata = parseAssetMetadata(component.asset_metadata);

  if (component.delivery_method === 'secure_text') {
    files.push({
      key: 'secure_text',
      name: `${component.title || 'Asset'} — Secure Payload`,
      size: component.secure_payload_text?.length ?? null,
      content_type: 'text/plain',
      kind: 'secure_text',
      previewable: Boolean(component.secure_payload_text),
    });
  }

  if (component.asset_file_path) {
    files.push({
      key: 'primary',
      name: component.asset_file_name || 'Download Package',
      size: component.asset_file_size ?? null,
      content_type: component.asset_content_type ?? null,
      kind: 'file',
      previewable: PREVIEWABLE_TYPES.has(component.asset_content_type ?? ''),
    });
  }

  if (component.file_url) {
    files.push({
      key: 'legacy_url',
      name: component.asset_file_name || 'Legacy Download',
      size: component.asset_file_size ?? null,
      content_type: component.asset_content_type ?? null,
      kind: 'legacy_url',
      previewable: false,
    });
  }

  for (const [index, extra] of (metadata.additional_files ?? []).entries()) {
    if (!extra?.path || !extra?.bucket) continue;
    files.push({
      key: `additional:${index}`,
      name: extra.name || `Resource ${index + 1}`,
      size: extra.size ?? null,
      content_type: extra.content_type ?? null,
      kind: 'file',
      previewable: PREVIEWABLE_TYPES.has(extra.content_type ?? ''),
    });
  }

  return files;
}

export function componentHasDownload(component: LibraryComponentFields): boolean {
  const metadata = parseAssetMetadata(component.asset_metadata);
  return Boolean(
    component.delivery_method === 'secure_text' ||
      component.asset_file_path ||
      component.file_url ||
      component.secure_payload_text ||
      (metadata.additional_files?.length ?? 0) > 0
  );
}

export function normalizeChangelog(
  metadata: AssetMetadata,
  publishedAt: string | null
): Array<{ version: string; date: string | null; notes: string }> {
  const raw = metadata.changelog;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((entry) => ({
      version: entry.version || '1.0',
      date: entry.date || entry.published_at || null,
      notes: entry.notes || '',
    }));
  }
  if (typeof raw === 'string' && raw.trim()) {
    return [{ version: resolveAssetVersion(metadata), date: publishedAt, notes: raw.trim() }];
  }
  if (publishedAt) {
    return [
      {
        version: resolveAssetVersion(metadata),
        date: publishedAt,
        notes: 'Initial published release.',
      },
    ];
  }
  return [];
}

type LibraryRow = {
  id: string;
  license_key: string | null;
  purchased_at: string;
  source: string;
  component_id: string | null;
  service_id: string | null;
};

export async function fetchLibraryAssetsForUser(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<LibraryAssetEntry[]> {
  const { data: libraryRows, error: libraryError } = await supabaseAdmin
    .from('library')
    .select('id, license_key, purchased_at, source, component_id, service_id')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });

  if (libraryError) throw libraryError;
  return hydrateLibraryRows(supabaseAdmin, libraryRows ?? []);
}

export async function fetchLibraryAssetById(
  supabaseAdmin: SupabaseClient,
  userId: string,
  libraryId: string
): Promise<LibraryAssetEntry | null> {
  const { data: libraryRow, error: libraryError } = await supabaseAdmin
    .from('library')
    .select('id, license_key, purchased_at, source, component_id, service_id')
    .eq('user_id', userId)
    .eq('id', libraryId)
    .maybeSingle();

  if (libraryError) throw libraryError;
  if (!libraryRow) return null;

  const [entry] = await hydrateLibraryRows(supabaseAdmin, [libraryRow]);
  return entry ?? null;
}

async function hydrateLibraryRows(
  supabaseAdmin: SupabaseClient,
  libraryRows: LibraryRow[]
): Promise<LibraryAssetEntry[]> {
  const componentIds = Array.from(
    new Set(libraryRows.map((row) => row.component_id).filter(Boolean))
  ) as string[];
  const serviceIds = Array.from(
    new Set(libraryRows.map((row) => row.service_id).filter(Boolean))
  ) as string[];

  const componentsById = new Map<string, LibraryComponentFields>();
  const servicesById = new Map<
    string,
    LibraryComponentFields & { download_metadata?: unknown }
  >();
  const buildersById = new Map<string, LibraryBuilderProfile>();

  if (componentIds.length > 0) {
    const { data: components, error: componentsError } = await supabaseAdmin
      .from('components')
      .select(
        'id, title, description, category, thumbnail_url, delivery_method, builder_id, published_at, created_at, asset_bucket, asset_file_path, asset_file_name, asset_file_size, asset_content_type, file_url, secure_payload_text, asset_metadata, status'
      )
      .in('id', componentIds);

    if (componentsError) throw componentsError;

    const builderIds = Array.from(
      new Set((components ?? []).map((c) => c.builder_id).filter(Boolean))
    ) as string[];

    if (builderIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles_public')
        .select('id, full_name, avatar_url, headline, average_rating, review_count')
        .in('id', builderIds);

      if (profilesError) throw profilesError;

      for (const profile of profiles ?? []) {
        buildersById.set(profile.id, profile as LibraryBuilderProfile);
      }
    }

    for (const component of components ?? []) {
      componentsById.set(component.id, {
        ...component,
        license_type: null,
        asset_metadata: parseAssetMetadata(component.asset_metadata),
      } as LibraryComponentFields);
    }
  }

  if (serviceIds.length > 0) {
    const { data: services, error: servicesError } = await supabaseAdmin
      .from('services')
      .select(
        'id, title, short_description, category, cover_image_url, builder_id, created_at, status, fulfillment_payload_text, fulfillment_payload_url, download_bucket, download_file_path, download_file_name, download_file_size, download_content_type, download_metadata'
      )
      .in('id', serviceIds);

    if (servicesError) throw servicesError;

    const builderIds = Array.from(
      new Set((services ?? []).map((s) => s.builder_id).filter(Boolean))
    ) as string[];

    if (builderIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles_public')
        .select('id, full_name, avatar_url, headline, average_rating, review_count')
        .in('id', builderIds);

      if (profilesError) throw profilesError;

      for (const profile of profiles ?? []) {
        if (!buildersById.has(profile.id)) {
          buildersById.set(profile.id, profile as LibraryBuilderProfile);
        }
      }
    }

    for (const service of services ?? []) {
      servicesById.set(service.id, {
        id: service.id,
        title: service.title,
        description: service.short_description,
        category: service.category,
        thumbnail_url: service.cover_image_url,
        delivery_method: service.fulfillment_payload_text ? 'secure_text' : 'file_upload',
        license_type: null,
        builder_id: service.builder_id,
        published_at: service.created_at,
        created_at: service.created_at,
        asset_bucket: service.download_bucket,
        asset_file_path: service.download_file_path,
        asset_file_name: service.download_file_name,
        asset_file_size: service.download_file_size,
        asset_content_type: service.download_content_type,
        file_url: service.fulfillment_payload_url,
        secure_payload_text: service.fulfillment_payload_text,
        asset_metadata: parseAssetMetadata(service.download_metadata),
        status: service.status,
        download_metadata: service.download_metadata,
      } as LibraryComponentFields & { download_metadata?: unknown });
    }
  }

  return libraryRows
    .map((entry) => {
      if (entry.service_id) {
        const service = servicesById.get(entry.service_id);
        if (!service) return null;
        const metadata = parseAssetMetadata(service.asset_metadata);
        const builder = service.builder_id ? buildersById.get(service.builder_id) ?? null : null;
        const files = buildSolutionLibraryFiles({
          title: service.title,
          fulfillment_payload_text: service.secure_payload_text,
          fulfillment_payload_url: service.file_url,
          download_file_path: service.asset_file_path,
          download_file_name: service.asset_file_name,
          download_file_size: service.asset_file_size,
          download_content_type: service.asset_content_type,
          download_metadata: metadata,
        });

        return {
          id: entry.id,
          purchased_at: entry.purchased_at,
          source: entry.source,
          component_id: null,
          service_id: entry.service_id,
          component: service,
          builder,
          version: resolveAssetVersion(metadata),
          asset_type: resolveAssetType(service.category, metadata),
          files,
          has_download: files.length > 0,
        };
      }

      const component = entry.component_id ? componentsById.get(entry.component_id) : undefined;
      if (!component) return null;

      const metadata = parseAssetMetadata(component.asset_metadata);
      const builder = component.builder_id ? buildersById.get(component.builder_id) ?? null : null;

      return {
        id: entry.id,
        purchased_at: entry.purchased_at,
        source: entry.source,
        component_id: entry.component_id,
        service_id: null,
        component,
        builder,
        version: resolveAssetVersion(metadata),
        asset_type: resolveAssetType(component.category, metadata),
        files: buildLibraryFiles(component),
        has_download: componentHasDownload(component),
      };
    })
    .filter(Boolean) as LibraryAssetEntry[];
}
