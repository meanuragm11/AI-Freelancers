"use client";

import React, { useState } from 'react';
import type { SupportAttachment } from '@/lib/support/types';

type Message = {
  id: string;
  sender_id: string | null;
  sender_role: 'user' | 'staff' | 'system';
  body: string;
  attachments: SupportAttachment[];
  is_internal: boolean;
  created_at: string;
};

type TicketConversationAdminProps = {
  ticketId: string;
  messages: Message[];
  onMessageSent: (message: Message) => void;
};

export default function TicketConversationAdmin({
  ticketId,
  messages,
  onMessageSent,
}: TicketConversationAdminProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/founder/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, attachments: [], isInternal }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send message.');
      onMessageSent(data.message);
      setBody('');
      setIsInternal(false);
    } catch (replyError: unknown) {
      setError(replyError instanceof Error ? replyError.message : 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Conversation</h2>
        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-slate-400 font-medium text-center py-6">No messages yet.</p>
          )}
          {messages.map((message) => {
            const isStaff = message.sender_role === 'staff';
            const isSystem = message.sender_role === 'system';

            return (
              <div
                key={message.id}
                className={`rounded-2xl border p-4 ${
                  message.is_internal
                    ? 'bg-amber-50 border-amber-200'
                    : isSystem
                      ? 'bg-slate-50 border-slate-200 text-slate-500 italic'
                      : isStaff
                        ? 'bg-blue-50 border-blue-100'
                        : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isSystem ? 'System' : isStaff ? 'Zelance Staff' : 'Customer'}
                    {message.is_internal && (
                      <span className="ml-2 text-amber-600">· Internal Only</span>
                    )}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{message.body}</p>
                {message.attachments?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.attachments.map((attachment) => (
                      <a
                        key={attachment.url}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"
                      >
                        {attachment.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleReply} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Reply</h3>
        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isInternal ? 'Internal comment (not visible to customer)...' : 'Write a reply to the customer...'}
          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none"
        />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            Mark as internal (staff-only)
          </label>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
              isInternal ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-900 hover:bg-blue-600 text-white'
            }`}
          >
            {submitting ? 'Sending...' : isInternal ? 'Save Internal Note' : 'Send Reply'}
          </button>
        </div>
      </form>
    </div>
  );
}
