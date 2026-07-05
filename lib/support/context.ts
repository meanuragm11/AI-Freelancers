import type { SupportContextIds } from './types';

const QUERY_ALIASES: Record<keyof SupportContextIds, string[]> = {
  transactionId: ['transactionId', 'transaction_id', 'txnId', 'txn_id'],
  escrowId: ['escrowId', 'escrow_id', 'collabId', 'collab_id'],
  projectId: ['projectId', 'project_id', 'collabId', 'collab_id'],
  serviceId: ['serviceId', 'service_id'],
  aiAssetId: ['aiAssetId', 'ai_asset_id', 'componentId', 'component_id', 'assetId', 'asset_id'],
};

function firstParam(params: URLSearchParams, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function parseSupportContextFromSearchParams(
  params: URLSearchParams
): SupportContextIds {
  return {
    transactionId: firstParam(params, QUERY_ALIASES.transactionId),
    escrowId: firstParam(params, QUERY_ALIASES.escrowId),
    projectId: firstParam(params, QUERY_ALIASES.projectId),
    serviceId: firstParam(params, QUERY_ALIASES.serviceId),
    aiAssetId: firstParam(params, QUERY_ALIASES.aiAssetId),
  };
}

export function parseSupportContextFromPath(pathname: string): SupportContextIds {
  const context: SupportContextIds = {};

  const serviceMatch = pathname.match(/\/buyer\/services\/([^/]+)/);
  if (serviceMatch) context.serviceId = serviceMatch[1];

  const componentMatch = pathname.match(/\/buyer\/components\/([^/]+)/);
  if (componentMatch) context.aiAssetId = componentMatch[1];

  const collabMatch = pathname.match(/\/buyer\/collabs\/([^/]+)/);
  if (collabMatch) {
    context.projectId = collabMatch[1];
    context.escrowId = collabMatch[1];
  }

  return context;
}

export function mergeSupportContext(
  ...sources: Array<SupportContextIds | undefined>
): SupportContextIds {
  return sources.reduce<SupportContextIds>((acc, source) => {
    if (!source) return acc;
    return {
      transactionId: source.transactionId ?? acc.transactionId,
      escrowId: source.escrowId ?? acc.escrowId,
      projectId: source.projectId ?? acc.projectId,
      serviceId: source.serviceId ?? acc.serviceId,
      aiAssetId: source.aiAssetId ?? acc.aiAssetId,
    };
  }, {});
}
