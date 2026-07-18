import type { DeliveryModel, PricingMode } from '@/types/marketplace';

export type SolutionCapability =
  | 'instant_download'
  | 'secure_delivery'
  | 'customizable'
  | 'open_source'
  | 'premium';

export type SolutionCapabilityInput = {
  delivery_model?: DeliveryModel | string | null;
  pricing_mode?: PricingMode | string | null;
  starting_price_usd?: number | null;
  capability_instant_download?: boolean | null;
  capability_secure_delivery?: boolean | null;
};

export const SOLUTION_CAPABILITY_META: Record<
  SolutionCapability,
  { label: string; description: string; className: string }
> = {
  instant_download: {
    label: 'Instant Download',
    description: 'Digital files delivered immediately after purchase',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  secure_delivery: {
    label: 'Secure Delivery',
    description: 'Encrypted payload or secure link unlocked after payment',
    className: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  customizable: {
    label: 'Customizable',
    description: 'Collaborative delivery with milestones and revisions',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  open_source: {
    label: 'Open Source',
    description: 'Free to acquire — community-ready AI solution',
    className: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  premium: {
    label: 'Premium',
    description: 'Paid AI solution from a verified expert',
    className: 'bg-amber-50 text-amber-900 border-amber-200',
  },
};

export function deriveSolutionCapabilities(service: SolutionCapabilityInput): SolutionCapability[] {
  const deliveryModel = (service.delivery_model ?? 'collaborative') as DeliveryModel;
  const pricingMode =
    service.pricing_mode ??
    (Number(service.starting_price_usd) === 0 ? 'free' : 'paid');
  const badges: SolutionCapability[] = [];

  if (pricingMode === 'free') badges.push('open_source');
  else badges.push('premium');

  if (deliveryModel === 'collaborative') {
    badges.push('customizable');
  }

  if (deliveryModel === 'instant') {
    if (service.capability_instant_download) badges.push('instant_download');
    if (service.capability_secure_delivery) badges.push('secure_delivery');
    if (!service.capability_instant_download && !service.capability_secure_delivery) {
      badges.push('instant_download');
    }
  }

  return badges;
}

export function computeCapabilityFlags(form: {
  delivery_model?: DeliveryModel | string;
  fulfillment_payload_text?: string | null;
  fulfillment_payload_url?: string | null;
  download_file_path?: string | null;
  existingDownload?: { path?: string | null } | null;
  pendingDownloadFile?: File | null;
}): { capability_instant_download: boolean; capability_secure_delivery: boolean } {
  const hasDownload = Boolean(
    form.download_file_path?.trim() ||
      form.existingDownload?.path?.trim() ||
      form.pendingDownloadFile
  );
  const hasSecure = Boolean(
    form.fulfillment_payload_text?.trim() || form.fulfillment_payload_url?.trim()
  );

  return {
    capability_instant_download: hasDownload,
    capability_secure_delivery: hasSecure,
  };
}
