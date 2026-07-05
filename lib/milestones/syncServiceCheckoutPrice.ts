import type { SupabaseClient } from '@supabase/supabase-js';

type MilestoneCheckoutInput = {
  id: string;
  collab_id: string;
  amount_usd: number | null;
  status: string;
  is_new_milestone?: boolean | null;
};

type CollabCheckoutInput = {
  service_id?: string | null;
  status?: string | null;
  payment_type?: string | null;
  fixed_price_usd?: number | null;
  escrow_amount_usd?: number | null;
};

/**
 * For direct service purchases, draft milestones can be reused while the listing
 * price changes. Resolve the live published service price before checkout/payment.
 */
export async function resolveServiceListingCheckoutAmount(
  supabaseAdmin: SupabaseClient,
  milestone: MilestoneCheckoutInput,
  collab: CollabCheckoutInput
): Promise<number> {
  const storedAmount = Number(milestone.amount_usd ?? 0);

  if (
    !collab.service_id ||
    collab.status !== 'pending_funding' ||
    milestone.status !== 'draft' ||
    milestone.is_new_milestone ||
    collab.payment_type !== 'single_payment'
  ) {
    return storedAmount;
  }

  const { data: service, error } = await supabaseAdmin
    .from('services')
    .select('starting_price_usd')
    .eq('id', collab.service_id)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  if (!service) return storedAmount;

  const livePrice = Number(service.starting_price_usd);
  if (!Number.isFinite(livePrice) || livePrice <= 0) return storedAmount;

  if (
    livePrice === storedAmount &&
    Number(collab.fixed_price_usd ?? 0) === livePrice &&
    Number(collab.escrow_amount_usd ?? 0) === livePrice
  ) {
    return livePrice;
  }

  const { error: milestoneError } = await supabaseAdmin
    .from('milestones')
    .update({ amount_usd: livePrice })
    .eq('id', milestone.id)
    .eq('status', 'draft');

  if (milestoneError) throw milestoneError;

  const { error: collabError } = await supabaseAdmin
    .from('collabs')
    .update({
      fixed_price_usd: livePrice,
      escrow_amount_usd: livePrice,
    })
    .eq('id', milestone.collab_id)
    .eq('status', 'pending_funding');

  if (collabError) throw collabError;

  return livePrice;
}
