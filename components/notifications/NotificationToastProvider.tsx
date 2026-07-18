"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import NotificationToastStack, {
  MAX_VISIBLE_TOASTS,
  type QueuedToast,
} from "@/components/notifications/NotificationToastStack";
import { formatNotificationForDisplay, type ClientNotification } from "@/lib/notifications/client";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "@/lib/notifications/playNotificationSound";
import { supabase } from "@/lib/supabaseClient";

interface NotificationContextValue {
  notifications: ClientNotification[];
  unreadCount: number;
  markAsRead: (id: string, link: string | null) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationToastProvider");
  }
  return context;
}

function mapRow(row: Record<string, unknown>): ClientNotification {
  return formatNotificationForDisplay({
    id: String(row.id),
    type: String(row.type ?? "system"),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    link: typeof row.link === "string" ? row.link : null,
    is_read: Boolean(row.is_read),
    created_at: String(row.created_at ?? new Date().toISOString()),
  });
}

let sharedChannel: RealtimeChannel | null = null;
let sharedChannelUserId: string | null = null;

async function removeSharedChannel() {
  if (!sharedChannel) return;
  const channel = sharedChannel;
  sharedChannel = null;
  sharedChannelUserId = null;
  await supabase.removeChannel(channel);
}

interface NotificationToastProviderProps {
  userId: string | undefined;
  children: React.ReactNode;
}

export default function NotificationToastProvider({
  userId,
  children,
}: NotificationToastProviderProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastState, setToastState] = useState<{
    visible: QueuedToast[];
    queue: QueuedToast[];
  }>({ visible: [], queue: [] });

  const initialFetchDoneRef = useRef(false);
  const userIdRef = useRef<string | undefined>(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const refreshNotifications = useCallback(async () => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) return;

    const [notificationsResult, unreadResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", activeUserId)
        .eq("is_read", false),
    ]);

    if (notificationsResult.data && !notificationsResult.error) {
      setNotifications(notificationsResult.data as ClientNotification[]);
    }

    if (!unreadResult.error) {
      setUnreadCount(unreadResult.count ?? 0);
    }
  }, []);

  const enqueueToast = useCallback((notification: ClientNotification) => {
    const toast: QueuedToast = {
      id: `${notification.id}-${Date.now()}`,
      notification,
    };

    setToastState((current) => {
      if (current.visible.length < MAX_VISIBLE_TOASTS) {
        return { ...current, visible: [...current.visible, toast] };
      }
      return { ...current, queue: [...current.queue, toast] };
    });

    playNotificationSound();
  }, []);

  const handleRealtimeInsert = useCallback(
    (row: Record<string, unknown>) => {
      if (!initialFetchDoneRef.current) return;

      const notification = mapRow(row);

      setNotifications((prev) => {
        if (prev.some((item) => item.id === notification.id)) return prev;
        return [notification, ...prev].slice(0, 20);
      });

      if (!notification.is_read) {
        setUnreadCount((prev) => prev + 1);
      }

      enqueueToast(notification);
    },
    [enqueueToast]
  );

  useEffect(() => {
    const unlockOnInteraction = () => {
      unlockNotificationSound();
    };

    window.addEventListener("pointerdown", unlockOnInteraction, { once: true });
    window.addEventListener("keydown", unlockOnInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockOnInteraction);
      window.removeEventListener("keydown", unlockOnInteraction);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      initialFetchDoneRef.current = false;
      void removeSharedChannel();
      return;
    }

    initialFetchDoneRef.current = false;

    void refreshNotifications().finally(() => {
      initialFetchDoneRef.current = true;
    });

    const channelName = `user_notifications_${userId}`;

    void (async () => {
      if (sharedChannel && sharedChannelUserId !== userId) {
        await removeSharedChannel();
      }

      const stale = supabase
        .getChannels()
        .find((ch) => ch.topic === `realtime:${channelName}`);
      if (stale && stale !== sharedChannel) {
        await supabase.removeChannel(stale);
      }

      if (sharedChannel && sharedChannelUserId === userId) {
        return;
      }

      sharedChannelUserId = userId;
      sharedChannel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            handleRealtimeInsert(payload.new as Record<string, unknown>);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void refreshNotifications();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void refreshNotifications();
          }
        )
        .subscribe();
    })();

    return () => {
      // Channel stays shared for the session; cleaned up on user change/sign-out.
    };
  }, [handleRealtimeInsert, refreshNotifications, userId]);

  const persistReadState = useCallback(async (id: string) => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", activeUserId);

    if (error) {
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const markAsRead = useCallback(
    async (id: string, link: string | null) => {
      const wasUnread = notifications.some((item) => item.id === id && !item.is_read);
      if (wasUnread) {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await persistReadState(id);

      if (link) {
        router.push(link);
      }
    },
    [notifications, persistReadState, router]
  );

  const markAllAsRead = useCallback(async () => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", activeUserId)
      .eq("is_read", false);

    if (error) {
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const dismissToast = useCallback((toastId: string) => {
    setToastState((current) => {
      const visible = current.visible.filter((toast) => toast.id !== toastId);
      const slotsAvailable = MAX_VISIBLE_TOASTS - visible.length;

      if (slotsAvailable <= 0 || current.queue.length === 0) {
        return { visible, queue: current.queue };
      }

      const promoted = current.queue.slice(0, slotsAvailable);
      const queue = current.queue.slice(slotsAvailable);
      return { visible: [...visible, ...promoted], queue };
    });
  }, []);

  const handleToastAction = useCallback(
    async (notification: ClientNotification) => {
      await markAsRead(notification.id, notification.link);
    },
    [markAsRead]
  );

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    }),
    [markAllAsRead, markAsRead, notifications, refreshNotifications, unreadCount]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {userId ? (
        <NotificationToastStack
          visibleToasts={toastState.visible}
          queuedToasts={toastState.queue}
          onDismiss={dismissToast}
          onAction={handleToastAction}
        />
      ) : null}
    </NotificationContext.Provider>
  );
}
