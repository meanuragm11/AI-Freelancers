import { supabase } from "@/lib/supabaseClient";

interface EscrowInput {
  collab_id: string;
  milestone_id: string;
  buyer_id: string;
  builder_id: string;
  amount_usd: number;
}

export async function createEscrow(data: EscrowInput) {
  const { error } = await supabase
    .from("escrow_transactions")
    .insert({
      collab_id: data.collab_id,
      milestone_id: data.milestone_id,
      buyer_id: data.buyer_id,
      builder_id: data.builder_id,
      amount_usd: data.amount_usd,
      transaction_type: "milestone_funding",
      status: "pending_payment",
    });

  if (error) throw error;
}