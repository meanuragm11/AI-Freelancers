import { supabase } from "@/lib/supabaseClient";
import { formatDisplayName } from "@/lib/display/formatDisplayName";
import { formatBuilderName } from "@/lib/display/formatBuilderName";
import type { ProjectRequest, ProjectRequestStatus } from "@/types/marketplace";
import { proposalCardMessage } from "@/lib/project-proposals/types";
import { notifyMessageRecipient } from "@/lib/notifyMessageRecipient";

export interface CreateProjectRequestInput {
  buyer_id: string;
  builder_id: string;
  service_id?: string | null;
  title: string;
  description: string;
  budget_usd?: number | null;
  expected_deadline?: string | null;
  reference_links?: string[];
  required_technologies?: string[];
  attachment_urls?: unknown[];
  priority?: string;
  additional_notes?: string | null;
  payment_type?: "single_payment" | "milestone_payment";
  proposed_milestones?: Array<{
    title: string;
    description: string;
    amount: number;
    deadline: string;
  }>;
}

export async function createProjectRequestWithConversation(input: CreateProjectRequestInput) {
  console.log("Creating project request with input:", input);

  const proposedAmount =
    input.payment_type === "milestone_payment" && input.proposed_milestones
      ? input.proposed_milestones.reduce((sum, milestone) => sum + milestone.amount, 0)
      : input.budget_usd ?? 0;

  const { data: collab, error: collabError } = await supabase
    .from("collabs")
    .insert({
      buyer_id: input.buyer_id,
      builder_id: input.builder_id,
      title: input.title,
      project_description: input.description,
      status: "negotiating",
      fixed_price_usd: proposedAmount,
      project_deadline: input.expected_deadline,
      service_id: input.service_id ?? null,
      payment_type: input.payment_type === "milestone_payment" ? "milestone_based" : "single_payment",
    })
    .select()
    .single();

  if (collabError) {
    console.error("Collab insert error:", collabError);
    throw collabError;
  }

  const { data: request, error: reqError } = await supabase
    .from("project_requests")
    .insert({
      buyer_id: input.buyer_id,
      builder_id: input.builder_id,
      service_id: input.service_id ?? null,
      title: input.title,
      description: input.description,
      budget_usd: proposedAmount,
      expected_deadline: input.expected_deadline,
      reference_links: input.reference_links ?? [],
      required_technologies: input.required_technologies ?? [],
      attachment_urls: input.attachment_urls ?? [],
      priority: input.priority ?? "normal",
      additional_notes: input.additional_notes,
      status: "pending",
      conversation_id: collab.id,
      payment_type: input.payment_type ?? "single_payment",
      agreed_amount_usd: proposedAmount,
    })
    .select()
    .single();

  if (reqError) {
    console.error("Project request insert error:", reqError);
    throw reqError;
  }

  await supabase.from("collabs").update({ project_request_id: request.id }).eq("id", collab.id);

  const snapshot = {
    title: input.title,
    description: input.description,
    payment_type: input.payment_type ?? "single_payment",
    budget_usd: proposedAmount,
    expected_deadline: input.expected_deadline ?? null,
    reference_links: input.reference_links ?? [],
    required_technologies: input.required_technologies ?? [],
    attachment_urls: input.attachment_urls ?? [],
    priority: input.priority ?? "normal",
    additional_notes: input.additional_notes ?? null,
  };

  const { data: negotiation, error: negotiationError } = await supabase
    .from("negotiation_history")
    .insert({
      project_request_id: request.id,
      proposed_by: input.buyer_id,
      proposal_type: "initial",
      proposed_amount_usd: proposedAmount,
      proposed_milestones: input.proposed_milestones ?? [],
      explanation: input.additional_notes,
      status: "pending",
      version: 1,
      proposal_snapshot: snapshot,
    })
    .select("id")
    .single();

  if (negotiationError) {
    console.error("Negotiation insert error:", negotiationError);
    throw negotiationError;
  }

  await supabase
    .from("project_requests")
    .update({ negotiation_round: 1, agreed_amount_usd: proposedAmount })
    .eq("id", request.id);

  const proposalMessage = proposalCardMessage(negotiation.id);
  const { data: initialMessage, error: msgError } = await supabase.from("messages").insert({
    collab_id: collab.id,
    sender_id: input.buyer_id,
    text: proposalMessage,
    content: proposalMessage,
    message_kind: "system",
    system_event_type: "proposal_card",
  }).select('id').single();

  if (msgError) {
    console.error("Message insert error:", msgError);
    // Don't throw - message failure shouldn't block the request
  }

  if (initialMessage?.id) {
    void notifyMessageRecipient(initialMessage.id);
  }

  void fetch(`/api/collabs/${collab.id}/sync-proposal-milestones`, { method: 'POST' });

  return { request: request as ProjectRequest, conversationId: collab.id };
}

export async function listBuilderProjectRequests(builderId: string) {
  const { data, error } = await supabase
    .from("project_requests")
    .select("*, buyer:profiles_public!buyer_id(full_name, avatar_url)")
    .eq("builder_id", builderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((request) => {
    const buyer = request.buyer as { full_name?: string | null; avatar_url?: string | null } | null;
    if (!buyer?.full_name) return request;
    return {
      ...request,
      buyer: {
        ...buyer,
        full_name: formatDisplayName(buyer.full_name),
      },
    };
  });
}

export async function listBuyerProjectRequests(buyerId: string) {
  const { data, error } = await supabase
    .from("project_requests")
    .select("*, builder:profiles_public!builder_id(full_name, avatar_url)")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((request) => {
    const builder = request.builder as { full_name?: string | null; avatar_url?: string | null } | null;
    if (!builder?.full_name) return request;
    return {
      ...request,
      builder: {
        ...builder,
        full_name: formatBuilderName(builder.full_name),
      },
    };
  });
}

export async function updateProjectRequestStatus(id: string, status: ProjectRequestStatus) {
  const { data, error } = await supabase
    .from("project_requests")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ProjectRequest;
}
