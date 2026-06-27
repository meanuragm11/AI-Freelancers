import { supabase } from "@/lib/supabaseClient";

interface CreateCollabInput {
  buyer_id: string;
  builder_id: string;
  title: string;
  project_description: string;
  fixed_price_usd: number;
  project_deadline: string;
}

export async function createCollab(data: CreateCollabInput) {
  const { data: collab, error } = await supabase
    .from("collabs")
    .insert({
      buyer_id: data.buyer_id,
      builder_id: data.builder_id,
      title: data.title,
      project_description: data.project_description,
      fixed_price_usd: data.fixed_price_usd,
      project_deadline: data.project_deadline,
      current_milestone: 1,
      completion_percentage: 0,
      status: "pending_funding",
    })
    .select()
    .single();

  if (error) throw error;

  return collab;
}