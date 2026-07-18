"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/components/notifications/NotificationToastProvider";
import { formatNotificationForDisplay, timeAgo } from "@/lib/notifications/client";

export default function NotificationBell({ userId }: { userId: string | undefined }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id: string, link: string | null) => {
    await markAsRead(id, link);
    if (link) {
      setIsOpen(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white bg-rose-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 animate-in fade-in slide-in-from-top-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                className="text-[9px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="custom-scrollbar max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                  <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  You&apos;re all caught up
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const displayNotification = formatNotificationForDisplay(notification);
                  return (
                  <div
                    key={notification.id}
                    onClick={() => void handleMarkAsRead(notification.id, notification.link)}
                    className={`flex cursor-pointer gap-4 p-4 transition-colors ${
                      notification.is_read
                        ? "hover:bg-slate-50"
                        : "bg-blue-50/30 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="mt-1">
                      {!notification.is_read && (
                        <span className="block h-2 w-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="mb-1 text-xs font-black leading-tight text-slate-900">
                        {displayNotification.title}
                      </p>
                      <p className="line-clamp-2 text-[11px] font-medium text-slate-600">
                        {displayNotification.message}
                      </p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
