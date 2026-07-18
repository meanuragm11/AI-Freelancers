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
import type { RealtimeChannel } from "@supabase/supabase-js";
import { fetchUnreadMessageCount } from "@/lib/messages/unreadCount";
import { supabase } from "@/lib/supabaseClient";

const BROADCAST_CHANNEL_NAME = "zelance-message-unread";

export type MessageRealtimeEvent = {
  type: "insert" | "update";
  message: Record<string, unknown>;
  previous?: Record<string, unknown>;
};

interface MessageUnreadContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  subscribeToMessages: (handler: (event: MessageRealtimeEvent) => void) => () => void;
}

const MessageUnreadContext = createContext<MessageUnreadContextValue | null>(null);

export function useMessageUnread(): MessageUnreadContextValue {
  const context = useContext(MessageUnreadContext);
  if (!context) {
    throw new Error("useMessageUnread must be used within MessageUnreadProvider");
  }
  return context;
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

interface MessageUnreadProviderProps {
  userId: string | undefined;
  children: React.ReactNode;
}

const REFRESH_DEBOUNCE_MS = 300;

export default function MessageUnreadProvider({
  userId,
  children,
}: MessageUnreadProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const userIdRef = useRef<string | undefined>(userId);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageSubscribersRef = useRef(new Set<(event: MessageRealtimeEvent) => void>());

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const emitMessageEvent = useCallback((event: MessageRealtimeEvent) => {
    messageSubscribersRef.current.forEach((handler) => handler(event));
  }, []);

  const subscribeToMessages = useCallback((handler: (event: MessageRealtimeEvent) => void) => {
    messageSubscribersRef.current.add(handler);
    return () => {
      messageSubscribersRef.current.delete(handler);
    };
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) {
      setUnreadCount(0);
      return;
    }

    const count = await fetchUnreadMessageCount(activeUserId);
    setUnreadCount(count);
  }, []);

  const notifyOtherTabs = useCallback(() => {
    try {
      broadcastRef.current?.postMessage({ type: "refresh" });
    } catch {
      // BroadcastChannel unavailable in some environments.
    }
  }, []);

  const scheduleRefreshUnreadCount = useCallback(() => {
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }

    refreshDebounceRef.current = setTimeout(() => {
      refreshDebounceRef.current = null;
      void refreshUnreadCount().then(() => {
        notifyOtherTabs();
      });
    }, REFRESH_DEBOUNCE_MS);
  }, [notifyOtherTabs, refreshUnreadCount]);

  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastRef.current = channel;

    channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "refresh") {
        void refreshUnreadCount();
      }
    };

    return () => {
      channel.close();
      broadcastRef.current = null;
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      void removeSharedChannel();
      return;
    }

    void refreshUnreadCount();

    const channelName = `user_messages_${userId}`;

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
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            emitMessageEvent({ type: "insert", message: payload.new as Record<string, unknown> });
            scheduleRefreshUnreadCount();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload) => {
            emitMessageEvent({
              type: "update",
              message: payload.new as Record<string, unknown>,
              previous: payload.old as Record<string, unknown>,
            });
            scheduleRefreshUnreadCount();
          },
        )
        .subscribe();
    })();

    return () => {
      // Shared channel persists for the session; cleaned up on user change/sign-out.
    };
  }, [emitMessageEvent, refreshUnreadCount, scheduleRefreshUnreadCount, userId]);

  const contextValue = useMemo<MessageUnreadContextValue>(
    () => ({
      unreadCount,
      refreshUnreadCount: async () => {
        await refreshUnreadCount();
        notifyOtherTabs();
      },
      subscribeToMessages,
    }),
    [notifyOtherTabs, refreshUnreadCount, subscribeToMessages, unreadCount],
  );

  return (
    <MessageUnreadContext.Provider value={contextValue}>
      {children}
    </MessageUnreadContext.Provider>
  );
}
