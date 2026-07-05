import { supabase } from "@/lib/supabaseClient";

interface CreateCollabInput {
  buyer_id: string;
  builder_id: string;
  title: string;
  project_description: string;
  fixed_price_usd: number;
  project_deadline: string;
  service_id?: string | null;
  project_request_id?: string | null;
  max_revisions?: number;
  extra_revision_price_usd?: number;
}

export async function createCollab(data: CreateCollabInput) {
  const { data: collab, error } = await supabase
    .from("collabs")
    .insert({
      buyer_id: data.buyer_id,
      builder_id: data.builder_id,
      title: data.title,
      description: data.project_description,
      project_description: data.project_description,
      escrow_amount_usd: data.fixed_price_usd,
      fixed_price_usd: data.fixed_price_usd,
      project_deadline: data.project_deadline,
      payment_type: "single_payment",
      current_milestone: 1,
      completion_percentage: 0,
      status: "pending_funding",
      service_id: data.service_id ?? null,
      project_request_id: data.project_request_id ?? null,
      max_revisions: data.max_revisions ?? undefined,
      extra_revision_price_usd: data.extra_revision_price_usd ?? undefined,
    })
    .select()
    .single();

  if (error) throw error;

  return collab;
}