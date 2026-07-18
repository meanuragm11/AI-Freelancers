/** Fields that must never appear in public marketplace queries */
export const SECURE_SERVICE_FIELDS = [
  "fulfillment_payload_text",
  "fulfillment_payload_url",
  "download_bucket",
  "download_file_path",
  "download_file_name",
  "download_file_size",
  "download_content_type",
  "download_metadata",
] as const;

export const PUBLIC_SERVICE_COLUMNS = `
  id, builder_id, title, short_description, detailed_description, category,
  ai_skills, tags, cover_image_url, banner_image_url, gallery_urls, demo_video_url,
  faqs, whats_included, delivery_time_days, included_revisions, extra_revision_price_usd,
  requirements_from_buyer, status, archived_at, starting_price_usd, pricing_mode,
  delivery_model, capability_instant_download, capability_secure_delivery,
  view_count, order_count, rating_avg, review_count, sales_count,
  created_at, updated_at
`.replace(/\s+/g, " ");

export type PricingMode = "free" | "paid";
export type DeliveryModel = "collaborative" | "instant";

export function serviceHasInstantFulfillment(service: {
  fulfillment_payload_text?: string | null;
  fulfillment_payload_url?: string | null;
  download_file_path?: string | null;
}): boolean {
  return Boolean(
    service.fulfillment_payload_text?.trim() ||
      service.fulfillment_payload_url?.trim() ||
      service.download_file_path
  );
}

export function platformFeeForInstantPurchase(amountUsd: number): number {
  return amountUsd < 20 ? 1 : 5;
}
