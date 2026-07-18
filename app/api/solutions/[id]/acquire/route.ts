import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getAuthenticatedUser } from "@/lib/server/supabase";
import { sendNotification, NotificationType } from "@/lib/notifications/notificationService";
import { solutionHasFulfillment } from "@/lib/solutions/fulfillment";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select(
        "id, title, builder_id, starting_price_usd, pricing_mode, delivery_model, status, fulfillment_payload_text, fulfillment_payload_url, download_file_path"
      )
      .eq("id", id)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service || service.status !== "published") {
      return NextResponse.json({ error: "AI Solution is not available" }, { status: 404 });
    }

    if (service.delivery_model !== "instant") {
      return NextResponse.json(
        { error: "Collaborative solutions must be purchased through checkout" },
        { status: 409 }
      );
    }

    if (service.pricing_mode !== "free" && Number(service.starting_price_usd) > 0) {
      return NextResponse.json(
        { error: "Paid solutions must be purchased through checkout" },
        { status: 409 }
      );
    }

    if (!solutionHasFulfillment(service)) {
      return NextResponse.json(
        { error: "This solution has no fulfillment content configured" },
        { status: 409 }
      );
    }

    const { data: libraryEntry, error: libraryError } = await supabaseAdmin
      .from("library")
      .upsert(
        {
          user_id: user.id,
          service_id: id,
          source: "free_acquisition",
        },
        { onConflict: "user_id,service_id" }
      )
      .select("id")
      .single();

    if (libraryError) throw libraryError;

    void sendNotification({
      type: NotificationType.AI_ASSET_PURCHASED,
      recipientId: user.id,
      title: "AI Solution added",
      message: `"${service.title}" has been added to your workspace library.`,
      link: "/buyer/library",
      metadata: {
        assetName: service.title,
        actorId: user.id,
        idempotencyKey: `solution-free:${user.id}:${id}`,
      },
    });

    return NextResponse.json({ success: true, libraryId: libraryEntry.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Solution acquisition failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
