import { supabase } from "@/lib/supabaseClient";

/** Count unread inbound messages for the signed-in user (RLS-scoped to their collabs). */
export async function fetchUnreadMessageCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .neq("sender_id", userId);

  if (error) {
    console.error("Failed to fetch unread message count:", error);
    return 0;
  }

  return count ?? 0;
}

export function formatUnreadBadgeCount(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}
