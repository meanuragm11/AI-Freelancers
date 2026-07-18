"use client";

import React, { useEffect, useState } from "react";
import MessageUnreadProvider from "@/components/messages/MessageUnreadProvider";
import NotificationToastProvider from "@/components/notifications/NotificationToastProvider";
import { supabase } from "@/lib/supabaseClient";

interface NotificationRootProps {
  children: React.ReactNode;
}

export default function NotificationRoot({ children }: NotificationRootProps) {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUserId(user?.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <MessageUnreadProvider key={userId ?? "signed-out-messages"} userId={userId}>
      <NotificationToastProvider key={userId ?? "signed-out-notifications"} userId={userId}>
        {children}
      </NotificationToastProvider>
    </MessageUnreadProvider>
  );
}
