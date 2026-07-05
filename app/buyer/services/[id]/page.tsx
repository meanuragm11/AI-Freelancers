import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

interface LegacyServicePageProps {
  params: Promise<{ id: string }>;
}

/** Backward compat: resolve builder UUID vs service UUID correctly */
export default async function LegacyBuyerServicePage({ params }: LegacyServicePageProps) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: service } = await supabase
    .from("services")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (service?.status === "published") {
    redirect(`/service/${id}`);
  }

  const { data: builderServices } = await supabase
    .from("services")
    .select("id")
    .eq("builder_id", id)
    .eq("status", "published")
    .order("order_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (builderServices?.length === 1) {
    redirect(`/service/${builderServices[0].id}`);
  }

  redirect(`/profile/${id}#services`);
}
