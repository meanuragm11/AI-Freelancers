"use client";

import React from "react";
import NotificationToast from "@/components/notifications/NotificationToast";
import type { ClientNotification } from "@/lib/notifications/client";

export interface QueuedToast {
  id: string;
  notification: ClientNotification;
}

const MAX_VISIBLE_TOASTS = 3;

interface NotificationToastStackProps {
  visibleToasts: QueuedToast[];
  queuedToasts: QueuedToast[];
  onDismiss: (toastId: string) => void;
  onAction: (notification: ClientNotification) => void;
}

export default function NotificationToastStack({
  visibleToasts,
  queuedToasts,
  onDismiss,
  onAction,
}: NotificationToastStackProps) {
  if (visibleToasts.length === 0) return null;

  return (
    <div
      aria-label="Notification alerts"
      className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:top-4 sm:w-full"
    >
      {visibleToasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          notification={toast.notification}
          onDismiss={() => onDismiss(toast.id)}
          onAction={() => onAction(toast.notification)}
        />
      ))}
      {queuedToasts.length > 0 ? (
        <span className="sr-only">{queuedToasts.length} more notifications queued</span>
      ) : null}
    </div>
  );
}

export { MAX_VISIBLE_TOASTS };
