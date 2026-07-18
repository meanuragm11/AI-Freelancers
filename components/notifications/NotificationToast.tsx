"use client";

import React from "react";
import {
  formatNotificationForDisplay,
  getNotificationActionLabel,
  getNotificationIconType,
  timeAgo,
  type ClientNotification,
} from "@/lib/notifications/client";

const TOAST_DURATION_MS = 5000;
const EXIT_ANIMATION_MS = 300;

export interface NotificationToastProps {
  notification: ClientNotification;
  onDismiss: () => void;
  onAction: () => void;
}

function NotificationIcon({ type }: { type: string }) {
  const iconType = getNotificationIconType(type);
  const className = "w-5 h-5";

  switch (iconType) {
    case "message":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "project":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case "payment":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "alert":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
  }
}

export default function NotificationToast({
  notification,
  onDismiss,
  onAction,
}: NotificationToastProps) {
  const [isExiting, setIsExiting] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const remainingMsRef = React.useRef(TOAST_DURATION_MS);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedAtRef = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startDismissTimer = React.useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsExiting(true);
    }, remainingMsRef.current);
  }, [clearTimer]);

  React.useEffect(() => {
    startDismissTimer();
    return clearTimer;
  }, [clearTimer, startDismissTimer]);

  React.useEffect(() => {
    if (!isExiting) return;
    const exitTimer = window.setTimeout(() => {
      onDismiss();
    }, EXIT_ANIMATION_MS);
    return () => window.clearTimeout(exitTimer);
  }, [isExiting, onDismiss]);

  const handleMouseEnter = () => {
    if (isPaused || isExiting) return;
    setIsPaused(true);
    pausedAtRef.current = Date.now();
    clearTimer();
  };

  const handleMouseLeave = () => {
    if (!isPaused || isExiting) return;
    const pausedAt = pausedAtRef.current;
    if (pausedAt !== null) {
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (Date.now() - pausedAt));
    }
    pausedAtRef.current = null;
    setIsPaused(false);
    startDismissTimer();
  };

  const handleDismissClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExiting(true);
  };

  const actionLabel = getNotificationActionLabel(notification.type);
  const displayNotification = formatNotificationForDisplay(notification);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onAction}
      className={`pointer-events-auto w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl transition-all duration-300 ease-out ${
        isExiting
          ? "translate-x-4 opacity-0"
          : "animate-in fade-in slide-in-from-right-4 duration-300"
      }`}
    >
      <div className="flex gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <NotificationIcon type={notification.type} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-xs font-black leading-tight text-slate-900">{displayNotification.title}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={handleDismissClick}
              className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="line-clamp-2 text-[11px] font-medium text-slate-600">{displayNotification.message}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {timeAgo(notification.created_at)}
            </span>
            {notification.link ? (
              <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600">
                {actionLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
