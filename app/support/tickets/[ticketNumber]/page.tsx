"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import TicketConversation from '@/components/support/TicketConversation';
import TicketStatusBadge from '@/components/support/TicketStatusBadge';
import type { SupportTicket, SupportTicketMessage } from '@/lib/support/types';

export default function SupportTicketDetailPage() {
  const router = useRouter();
  const params = useParams<{ ticketNumber: string }>();
  const ticketNumber = decodeURIComponent(params.ticketNumber);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth?redirect=/support/tickets/${encodeURIComponent(ticketNumber)}`);
      return;
    }

    const response = await fetch(`/api/support/${encodeURIComponent(ticketNumber)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load ticket');
    }

    setTicket(data.ticket);
    setMessages(data.messages ?? []);
  };

  useEffect(() => {
    void loadTicket()
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load ticket');
      })
      .finally(() => setLoading(false));
  }, [ticketNumber]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-160px)] bg-slate-50 flex items-center justify-center">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-[calc(100vh-160px)] bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-md">
          <p className="text-slate-600 font-medium mb-4">{error || 'Ticket not found'}</p>
          <Link href="/support/tickets" className="text-blue-600 font-bold hover:text-blue-700">
            Back to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 py-10 px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/support/tickets" className="inline-flex text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
          ← Back to My Tickets
        </Link>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-sm font-black font-mono text-slate-500">{ticket.ticket_number}</span>
                <TicketStatusBadge status={ticket.status} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {ticket.priority} priority
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{ticket.subject}</h1>
              <p className="text-sm text-slate-500 mt-2">{ticket.category}</p>
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Opened {new Date(ticket.created_at).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {[
              ['Transaction ID', ticket.transaction_id],
              ['Escrow ID', ticket.escrow_id],
              ['Project ID', ticket.project_id],
              ['Service ID', ticket.service_id],
              ['AI Solution ID', ticket.ai_asset_id],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="font-mono text-slate-700 break-all">{value}</p>
                </div>
              ))}
          </div>
        </div>

        <TicketConversation
          ticketNumber={ticket.ticket_number}
          messages={messages}
          status={ticket.status}
          onMessageSent={(message) => {
            setMessages((prev) => [...prev, message]);
            setTicket((prev) => (prev ? { ...prev, status: prev.status === 'waiting_for_user' ? 'open' : prev.status } : prev));
          }}
          onReopened={() => {
            void loadTicket();
          }}
        />
      </div>
    </div>
  );
}
