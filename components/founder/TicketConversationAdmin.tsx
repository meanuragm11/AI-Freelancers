"use client";

import React, { useEffect, useState } from 'react';
import type { SupportAttachment } from '@/lib/support/types';

type Message = {
  id: string;
  sender_id: string | null;
  sender_role: 'user' | 'staff' | 'system';
  body: string;
  attachments: SupportAttachment[];
  created_at: string;
};

type TicketConversationAdminProps = {
  ticketId: string;
  onStatusChange?: (status: string) => void;
};

function senderLabel(role: Message['sender_role']) {
  if (role === 'staff') return 'Zelance Support';
  if (role === 'system') return 'System';
  return 'Customer';
}

function formatFileSize(size?: number) {
  if (!size) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(type: string) {
  return type.startsWith('image/') || type === 'application/pdf';
}

export default function TicketConversationAdmin({
  ticketId,
  onStatusChange,
}: TicketConversationAdminProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<SupportAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/founder/tickets/${ticketId}/messages`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load conversation');
      setMessages(data.messages ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/founder/tickets/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      setAttachments((prev) => [...prev, data.attachment]);
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim() && attachments.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/founder/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, attachments }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send message.');
      setMessages((prev) => [...prev, data.message]);
      if (data.status && onStatusChange) onStatusChange(data.status);
      setBody('');
      setAttachments([]);
    } catch (replyError: unknown) {
      setError(replyError instanceof Error ? replyError.message : 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Conversation</h2>

        {loading && (
          <p className="text-sm text-slate-400 font-medium py-6 text-center">Loading conversation...</p>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-sm text-slate-400 font-medium py-6 text-center">No messages yet.</p>
        )}

        {!loading && messages.length > 0 && (
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {messages.map((message) => (
              <div key={message.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between gap-3 mb-2 text-xs">
                  <span className="font-black uppercase tracking-widest text-slate-600">
                    {senderLabel(message.sender_role)}
                  </span>
                  <span className="font-medium text-slate-400">{new Date(message.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{message.body}</p>
                {message.attachments?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.url} className="border border-slate-200 rounded-lg bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-blue-600 hover:text-blue-700"
                          >
                            {attachment.name}
                          </a>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {formatFileSize(attachment.size) || 'File'}
                          </span>
                        </div>
                        {isPreviewable(attachment.type) && attachment.type.startsWith('image/') && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="mt-2 max-h-48 rounded border border-slate-100 object-contain"
                          />
                        )}
                        {isPreviewable(attachment.type) && attachment.type === 'application/pdf' && (
                          <iframe
                            src={attachment.url}
                            title={attachment.name}
                            className="mt-2 h-48 w-full rounded border border-slate-100"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleReply} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Reply</h3>
        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply to the customer..."
          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none"
        />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <span
                key={attachment.url}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                {attachment.name}
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((item) => item.url !== attachment.url))}
                  className="text-slate-400 hover:text-rose-600"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <span className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100">
              {uploading ? 'Uploading...' : 'Attach File'}
            </span>
          </label>
          <button
            type="submit"
            disabled={submitting || uploading || (!body.trim() && attachments.length === 0)}
            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 bg-slate-900 hover:bg-blue-600 text-white"
          >
            {submitting ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      </form>
    </div>
  );
}
