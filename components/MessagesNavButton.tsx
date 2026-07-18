"use client";

import React from "react";
import Link from "next/link";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { getMessagesHrefForUser } from "@/lib/messages/routes";
import type { ProfileAccountFlags } from "@/lib/accountMode";

interface MessagesNavButtonProps {
  profile: ProfileAccountFlags | null | undefined;
}

export default function MessagesNavButton({ profile }: MessagesNavButtonProps) {
  const { badgeLabel } = useUnreadMessageCount();
  const href = getMessagesHrefForUser(profile);

  return (
    <Link
      href={href}
      className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      aria-label={badgeLabel ? `Messages, ${badgeLabel} unread` : "Messages"}
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      {badgeLabel && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-blue-600 px-1 text-[9px] font-black leading-none text-white">
          {badgeLabel}
        </span>
      )}
    </Link>
  );
}
