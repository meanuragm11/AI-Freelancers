import { supabase } from "@/lib/supabaseClient";
import { createCollab } from "@/lib/hire/createCollab";
import type { Quotation, QuotationStatus } from "@/types/marketplace";
import { NotificationType } from "@/lib/notifications/types";

export interface CreateQuotationInput {
  project_request_id: string;
  builder_id: string;
  buyer_id: string;
  price_usd: number;
  estimated_delivery_days: number;
  included_revisions: number;
  notes?: string | null;
}

export async function createQuotation(input: CreateQuotationInput) {
  const { data, error } = await supabase
    .from("quotations")
    .insert({ ...input, status: "pending" })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("project_requests").update({ status: "quoted" }).eq("id", input.project_request_id);

  const quoteText = `[[QUOTATION|${data.id}|${input.price_usd}|${input.estimated_delivery_days}|${input.included_revisions}]]${input.notes ? `\n${input.notes}` : ""}`;

  const { data: req } = await supabase
    .from("project_requests")
    .select("conversation_id")
    .eq("id", input.project_request_id)
    .single();

  if (req?.conversation_id) {
    const { data: msg } = await supabase.from("messages").insert({
      collab_id: req.conversation_id,
      sender_id: input.builder_id,
      text: quoteText,
      content: quoteText,
    }).select('id').single();

    if (msg?.id) {
      void import('@/lib/notifyMessageRecipient').then(({ notifyMessageRecipient }) =>
        notifyMessageRecipient(msg.id)
      );
    }
  }

  return data as Quotation;
}

export async function updateQuotationStatus(id: string, status: QuotationStatus, userId: string) {
  const { data: quote, error: fetchError } = await supabase
    .from("quotations")
    .select("*, project_requests(*)")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  if (quote.buyer_id !== userId && quote.builder_id !== userId) {
    throw new Error("Not authorized");
  }

  const { data, error } = await supabase
    .from("quotations")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (status === "accepted") {
    const req = quote.project_requests;

    const { data: existingCollab, error: existingCollabError } = await supabase
      .from("collabs")
      .select("id")
      .eq("project_request_id", quote.project_request_id)
      .in("status", ["pending_funding", "funded", "in_progress", "submitted", "disputed", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingCollabError) throw existingCollabError;
    if (existingCollab) {
      const { data: milestone } = await supabase
        .from("milestones")
        .select("id")
        .eq("collab_id", existingCollab.id)
        .eq("status", "draft")
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        quotation: data as Quotation,
        collabId: existingCollab.id,
        milestoneId: milestone?.id,
        milestoneCheckout: Boolean(milestone?.id),
      };
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + quote.estimated_delivery_days);

    const collab = await createCollab({
      buyer_id: quote.buyer_id,
      builder_id: quote.builder_id,
      title: req.title,
      project_description: req.description,
      fixed_price_usd: Number(quote.price_usd),
      project_deadline: deadline.toISOString().split("T")[0],
      max_revisions: quote.included_revisions,
    });

    let extraRevisionPriceUsd: number | undefined;
    if (req.service_id) {
      const { data: service } = await supabase
        .from("services")
        .select("extra_revision_price_usd")
        .eq("id", req.service_id)
        .maybeSingle();
      extraRevisionPriceUsd = Number(service?.extra_revision_price_usd ?? 0) || undefined;
    }

    await supabase
      .from("collabs")
      .update({
        project_request_id: quote.project_request_id,
        service_id: req.service_id,
        max_revisions: quote.included_revisions,
        extra_revision_price_usd: extraRevisionPriceUsd,
        status: "pending_funding",
      })
      .eq("id", collab.id);

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .insert({
        collab_id: collab.id,
        title: "Project Delivery",
        description: quote.notes || "Full project delivery",
        amount_usd: Number(quote.price_usd),
        order_index: 1,
        due_date: deadline.toISOString(),
        status: "draft",
      })
      .select()
      .single();
    if (milestoneError) throw milestoneError;

    await supabase.from("project_requests").update({ status: "accepted" }).eq("id", quote.project_request_id);

    void import('@/lib/notifications/triggerNotification').then(({ triggerNotification }) => {
      triggerNotification({
        type: NotificationType.QUOTATION_ACCEPTED,
        recipientId: quote.builder_id,
        title: 'Quotation accepted',
        message: `Your quotation for "${req.title}" was accepted. The project is ready for funding.`,
        link: `/collab/${collab.id}`,
        metadata: {
          collabId: collab.id,
          projectName: req.title,
          amount: quote.price_usd,
        },
      });
    });

    return {
      quotation: data as Quotation,
      collabId: collab.id,
      milestoneId: milestone.id,
      milestoneCheckout: true,
    };
  }

  if (status === "rejected") {
    await supabase.from("project_requests").update({ status: "negotiating" }).eq("id", quote.project_request_id);
  }

  if (status === "changes_requested") {
    await supabase.from("project_requests").update({ status: "negotiating" }).eq("id", quote.project_request_id);
  }

  return { quotation: data as Quotation };
}

export async function listQuotationsForRequest(projectRequestId: string) {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("project_request_id", projectRequestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Quotation[];
}
