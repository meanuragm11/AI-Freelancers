"use client";

import { useMessageUnread } from "@/components/messages/MessageUnreadProvider";
import { formatUnreadBadgeCount } from "@/lib/messages/unreadCount";

export function useUnreadMessageCount() {
  const { unreadCount, refreshUnreadCount } = useMessageUnread();

  return {
    unreadCount,
    badgeLabel: formatUnreadBadgeCount(unreadCount),
    refreshUnreadCount,
  };
}
