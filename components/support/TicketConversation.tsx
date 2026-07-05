"use client";

import React, { useState } from 'react';
import type { SupportAttachment, SupportTicketMessage } from '@/lib/support/types';
import {
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_MAX_FILES,
  SUPPORT_ATTACHMENT_TYPES,
} from '@/lib/support/constants';

type TicketConversationProps = {
  ticketNumber: string;
  messages: SupportTicketMessage[];
  status: string;
  onMessageSent: (message: SupportTicketMessage) => void;
  onReopened?: () => void;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TicketConversation({
  ticketNumber,
  messages,
  status,
  onMessageSent,
  onReopened,
}: TicketConversationProps) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReply = !['closed'].includes(status);
  const canReopen = ['resolved', 'closed'].includes(status);

  const uploadAttachments = async (): Promise<SupportAttachment[]> => {
    const uploaded: SupportAttachment[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to upload ${file.name}`);
      }

      uploaded.push(data.attachment);
    }

    return uploaded;
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim() && files.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const attachments = files.length > 0 ? await uploadAttachments() : [];

      const response = await fetch(`/api/support/${encodeURIComponent(ticketNumber)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, attachments }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      onMessageSent(data.message);
      setBody('');
      setFiles([]);
    } catch (replyError: unknown) {
      setError(replyError instanceof Error ? replyError.message : 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    setReopening(true);
    setError(null);

    try {
      const response = await fetch(`/api/support/${encodeURIComponent(ticketNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reopen ticket.');
      }

      onReopened?.();
    } catch (reopenError: unknown) {
      setError(reopenError instanceof Error ? reopenError.message : 'Failed to reopen ticket.');
    } finally {
      setReopening(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Conversation</h2>

        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {messages.map((message) => {
            const isStaff = message.sender_role === 'staff';
            const isSystem = message.sender_role === 'system';

            return (
              <div
                key={message.id}
                className={`rounded-2xl border p-4 ${
                  isSystem
                    ? 'bg-slate-50 border-slate-200 text-slate-500 italic'
                    : isStaff
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isSystem ? 'System' : isStaff ? 'Zelance Support' : 'You'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">{formatTime(message.created_at)}</p>
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

      {canReopen && (
        <button
          type="button"
          onClick={handleReopen}
          disabled={reopening}
          className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          {reopening ? 'Reopening...' : 'Reopen Ticket'}
        </button>
      )}

      {canReply && (
        <form onSubmit={handleReply} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Add a reply</h3>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none"
          />
          <input
            type="file"
            multiple
            accept={SUPPORT_ATTACHMENT_TYPES.join(',')}
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []).filter(
                (file) =>
                  file.size <= SUPPORT_ATTACHMENT_MAX_BYTES &&
                  SUPPORT_ATTACHMENT_TYPES.includes(file.type)
              );
              setFiles((prev) => [...prev, ...selected].slice(0, SUPPORT_ATTACHMENT_MAX_FILES));
              event.target.value = '';
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-slate-900 file:text-white hover:file:bg-blue-600"
          />
          {files.length > 0 && (
            <p className="text-xs text-slate-500 font-medium">{files.length} file(s) selected</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  );
}
